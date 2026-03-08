import { apiClient } from './api-client';

// Override base URL for grandmaster API
const GM_BASE = '/../../gm/api/v1';

const gmRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('gm_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Build the grandmaster API URL
  const getGmApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace('/nh/api/v1', '/gm/api/v1');
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/gm/api/v1';
    }
    return (import.meta.env.VITE_PRODUCTION_API_URL || 'https://your-backend.railway.app/nh/api/v1')
      .replace('/nh/api/v1', '/gm/api/v1');
  };

  const response = await fetch(`${getGmApiUrl()}${endpoint}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'API Error');
  return data;
};

export const gmApi = {
  get: (endpoint) => gmRequest(endpoint),
  post: (endpoint, body) => gmRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => gmRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => gmRequest(endpoint, { method: 'DELETE' }),
};

// Auth
export const gmLogin = (credentials) => gmApi.post('/auth/login', credentials);
export const gmGetMe = () => gmApi.get('/auth/me');

// Token management
export const getGmToken = () => localStorage.getItem('gm_token');
export const setGmToken = (token) => localStorage.setItem('gm_token', token);
export const removeGmToken = () => localStorage.removeItem('gm_token');
export const getGmUser = () => {
  const u = localStorage.getItem('gm_user');
  return u ? JSON.parse(u) : null;
};
export const setGmUser = (user) => localStorage.setItem('gm_user', JSON.stringify(user));
export const removeGmUser = () => localStorage.removeItem('gm_user');

// Organizations
export const listOrganizations = (params) => {
  const qs = new URLSearchParams(params).toString();
  return gmApi.get(`/organizations${qs ? `?${qs}` : ''}`);
};
export const getOrganization = (id) => gmApi.get(`/organizations/${id}`);
export const onboardOrganization = (data) => gmApi.post('/organizations', data);
export const updateOrganization = (id, data) => gmApi.put(`/organizations/${id}`, data);
export const updateOrgModules = (id, modules) => gmApi.put(`/organizations/${id}/modules`, { enabledModules: modules });
export const suspendOrganization = (id, reason) => gmApi.post(`/organizations/${id}/suspend`, { reason });
export const reactivateOrganization = (id) => gmApi.post(`/organizations/${id}/reactivate`);
export const deleteOrganization = (id) => gmApi.delete(`/organizations/${id}`);

// ─── Grandmaster Power APIs ───

// Settings control
export const getOrgSettingsConfig = (id) => gmApi.get(`/organizations/${id}/settings-config`);
export const updateOrgSettingsTabs = (id, tabs) => gmApi.put(`/organizations/${id}/settings-tabs`, { allowedSettingsTabs: tabs });

// Payment config
export const updateOrgPaymentConfig = (id, module, config) => gmApi.put(`/organizations/${id}/payment-config`, { module, config });
export const updateOrgBulkPaymentConfig = (id, paymentConfig) => gmApi.put(`/organizations/${id}/payment-config/bulk`, { paymentConfig });

// Impersonation
export const impersonateOrg = (id) => gmApi.post(`/organizations/${id}/impersonate`);

// Remote CRUD proxy
export const proxyList = (orgId, resource, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return gmApi.get(`/organizations/${orgId}/data/${resource}${qs ? `?${qs}` : ''}`);
};
export const proxyGetById = (orgId, resource, recordId) => gmApi.get(`/organizations/${orgId}/data/${resource}/${recordId}`);
export const proxyCreate = (orgId, resource, data) => gmApi.post(`/organizations/${orgId}/data/${resource}`, data);
export const proxyUpdate = (orgId, resource, recordId, data) => gmApi.put(`/organizations/${orgId}/data/${resource}/${recordId}`, data);
export const proxyDelete = (orgId, resource, recordId) => gmApi.delete(`/organizations/${orgId}/data/${resource}/${recordId}`);

// Plans
export const listPlans = (params) => {
  const qs = new URLSearchParams(params).toString();
  return gmApi.get(`/plans${qs ? `?${qs}` : ''}`);
};
export const createPlan = (data) => gmApi.post('/plans', data);
export const updatePlan = (id, data) => gmApi.put(`/plans/${id}`, data);
export const deletePlan = (id) => gmApi.delete(`/plans/${id}`);

// Subscriptions
export const listSubscriptions = (params) => {
  const qs = new URLSearchParams(params).toString();
  return gmApi.get(`/subscriptions${qs ? `?${qs}` : ''}`);
};
export const createSubscription = (data) => gmApi.post('/subscriptions', data);
export const recordPayment = (id, data) => gmApi.post(`/subscriptions/${id}/payment`, data);
export const cancelSubscription = (id) => gmApi.post(`/subscriptions/${id}/cancel`);
export const checkExpiredSubscriptions = () => gmApi.post('/subscriptions/check-expired');

// Monitoring
export const getPlatformStats = () => gmApi.get('/monitoring/stats');
export const getOrgStats = (id) => gmApi.get(`/monitoring/organizations/${id}`);
export const getRecentOnboarded = () => gmApi.get('/monitoring/recent');

// Admins
export const listAdmins = () => gmApi.get('/admins');
export const createAdmin = (data) => gmApi.post('/admins', data);
export const updateAdmin = (id, data) => gmApi.put(`/admins/${id}`, data);
export const deleteAdmin = (id) => gmApi.delete(`/admins/${id}`);

// Notices
export const listNotices = (params) => {
  const qs = new URLSearchParams(params).toString();
  return gmApi.get(`/notices${qs ? `?${qs}` : ''}`);
};
export const createNotice = (data) => gmApi.post('/notices', data);
export const updateNotice = (id, data) => gmApi.put(`/notices/${id}`, data);
export const deleteNotice = (id) => gmApi.delete(`/notices/${id}`);

// Platform Config
export const listConfigs = (category) => gmApi.get(`/config${category ? `?category=${category}` : ''}`);
export const getConfig = (key) => gmApi.get(`/config/${key}`);
export const upsertConfig = (data) => gmApi.put('/config', data);
export const deleteConfig = (key) => gmApi.delete(`/config/${key}`);
