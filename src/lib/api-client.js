// Auto-detect environment for API URL
const getApiUrl = () => {
  // Check for explicit env variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detect: localhost = dev backend, otherwise production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/nh/api/v1';
  }
  
  // Production: Update this with your deployed backend URL
  return import.meta.env.VITE_PRODUCTION_API_URL || 'https://your-backend.railway.app/nh/api/v1';
};

export const API_URL = getApiUrl();
const ORG_SLUG_KEY = 'org_slug';

// Auth token management
export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

// Organization slug management for tenant routing
export const getOrgSlug = () => {
  const stored = String(localStorage.getItem(ORG_SLUG_KEY) || '').trim().toLowerCase();
  if (stored) return stored;

  const host = String(window.location.hostname || '').toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return '';
  }

  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] && parts[0] !== 'www') {
    return parts[0];
  }
  return '';
};
export const setOrgSlug = (slug) => {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) {
    localStorage.removeItem(ORG_SLUG_KEY);
    return;
  }
  localStorage.setItem(ORG_SLUG_KEY, normalized);
};
export const removeOrgSlug = () => localStorage.removeItem(ORG_SLUG_KEY);

// User object management
export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('user');

// API client with auth
export const apiClient = {
  async request(endpoint, options = {}) {
    const token = getAuthToken();
    const orgSlug = getOrgSlug();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(orgSlug && { 'x-org-slug': orgSlug }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API Error');
    }
    // Normalize to axios-like response: { data: <parsed JSON> }
    return data;
  },

  get: (endpoint) => apiClient.request(endpoint),
  post: (endpoint, body) => apiClient.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiClient.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiClient.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => apiClient.request(endpoint, { method: 'DELETE' }),
};
