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
  
  // Production: default to the same Render service that serves the frontend.
  return import.meta.env.VITE_PRODUCTION_API_URL || `${window.location.origin}/nh/api/v1`;
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

// User object management. Resilient to corrupt JSON in localStorage so a
// bad write can never crash the app at boot.
export const getUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    try { localStorage.removeItem('user'); } catch {}
    return null;
  }
};
export const setUser = (user) => {
  try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
};
export const removeUser = () => {
  try { localStorage.removeItem('user'); } catch {}
};

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

    let response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } catch (networkErr) {
      const err = new Error(`Network error reaching ${endpoint}: ${networkErr?.message || networkErr}`);
      err.cause = networkErr;
      err.isNetworkError = true;
      throw err;
    }

    // 204 No Content / empty body
    if (response.status === 204) {
      if (!response.ok) throw new Error(`API ${response.status} (${endpoint})`);
      return null;
    }

    // Guard against non-JSON responses (e.g. SPA index.html served when the
    // backend isn't reachable). Surface a clean error instead of the cryptic
    // "Unexpected token '<'" from JSON.parse.
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    let raw = null;
    if (isJson) {
      try {
        raw = await response.json();
      } catch {
        raw = null;
      }
    } else {
      // Drain the body so the connection can close.
      try { await response.text(); } catch {}
      if (!response.ok) {
        throw new Error(`API ${response.status} (${endpoint})`);
      }
      throw new Error(`Expected JSON from ${endpoint} but received ${contentType || 'unknown'}`);
    }

    if (!response.ok) {
      const msg = (raw && (raw.message || raw.error)) || `API ${response.status} (${endpoint})`;
      const err = new Error(msg);
      err.status = response.status;
      err.data = raw;
      throw err;
    }

    return raw;
  },

  get: (endpoint) => apiClient.request(endpoint),
  post: (endpoint, body) => apiClient.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiClient.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiClient.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => apiClient.request(endpoint, { method: 'DELETE' }),
};
