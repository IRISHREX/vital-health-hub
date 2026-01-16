// Auto-detect environment for API URL
const getApiUrl = (): string => {
  // Check for explicit env variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detect: localhost = dev backend, otherwise production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Production: Update this with your deployed backend URL
  return import.meta.env.VITE_PRODUCTION_API_URL || 'https://your-backend.railway.app/api';
};

export const API_URL = getApiUrl();

// Auth token management
export const getAuthToken = (): string | null => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

// API client with auth
export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API Error');
    }
    return data;
  },

  get: (endpoint: string) => apiClient.request(endpoint),
  post: (endpoint: string, body: unknown) => apiClient.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: unknown) => apiClient.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint: string, body: unknown) => apiClient.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint: string) => apiClient.request(endpoint, { method: 'DELETE' }),
};
