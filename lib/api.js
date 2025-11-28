// lib/api.js

import { API_URL } from './config';

class API {
  constructor() {
    // Attempt to load token from localStorage if running in browser
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    } else {
      this.token = null;
    }
    this.baseURL = API_URL;
  }

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // --- START FIX for Token Race Condition ---
    let currentToken = this.token;
    if (!currentToken && typeof window !== 'undefined') {
        // Fallback check: If the internal token is null, check localStorage again
        currentToken = localStorage.getItem('authToken');
        // Update the internal token if found, so subsequent calls are faster
        if (currentToken) {
            this.token = currentToken; 
        }
    }
    
    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }
    // --- END FIX ---

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers,
    });

    // Check if the response is valid JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        // If it's not JSON (e.g., HTML 404), throw a generic error
        throw new Error(`API returned non-JSON response for ${path}: Status ${response.status}`);
    }

    const data = await response.json();
    
    // CRITICAL FIX: Only check for an 'error' property if the response is a non-null object.
    // This allows successful array responses (like /api/admin/customers) to pass.
    if (typeof data === 'object' && data !== null && data.error) {
      // NOTE: If the worker returns a 401 on /api/user/info, this will throw,
      // and app/page.js will catch it and call clearToken().
      throw new Error(data.error);
    }

    return data;
  }

  get(path) {
    return this.request(path);
  }

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(path, body) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(path) {
    return this.request(path, {
      method: 'DELETE',
    });
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }
}

export const api = new API();
