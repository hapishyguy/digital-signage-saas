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
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers,
    });

    // 💥 CRITICAL FIX: If 401 Unauthorized, clear token and throw error.
    if (response.status === 401) {
        this.clearToken(); 
        // Throwing an error ensures the calling component (like app/page.js) handles the failure
        throw new Error('Unauthorized'); 
    }

    // Check if the response is valid JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`API returned non-JSON response for ${path}: Status ${response.status}`);
    }

    const data = await response.json();
    
    // Check for an 'error' property on failure
    if (typeof data === 'object' && data !== null && data.error) {
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
