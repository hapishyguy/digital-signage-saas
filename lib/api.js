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

    // Handle 401 Unauthorized errors immediately
    if (response.status === 401) {
        this.clearToken(); 
        throw new Error('Unauthorized'); 
    }
    
    // CRITICAL FIX: Safely check for and parse JSON content.
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let data = {};
    if (isJson) {
        try {
            data = await response.json();
        } catch (e) {
            // If response is marked as JSON but is empty/malformed
            throw new Error(`API returned an invalid JSON response for ${path}.`);
        }
    } else if (!response.ok && response.status !== 204) { // Ignore 204 No Content
        // If it's not JSON and not successful (e.g., Worker crash)
        throw new Error(`API call to ${path} failed with status ${response.status}. Please check Worker logs.`);
    }

    // Check for general success/failure based on status code
    if (!response.ok) {
        // Use the error from the body or a generic message
        const errorMessage = data.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    // If response is OK (2xx), return the data.
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
