import { API_URL } from './config';

class API {
  constructor() {
    this.token = null;
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

    const data = await response.json();
    
    if (data.error) {
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
  }

  clearToken() {
    this.token = null;
  }
}

export const api = new API();
