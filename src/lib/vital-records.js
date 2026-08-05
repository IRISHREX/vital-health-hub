import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v);
  });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const getVitalRecordStats = (params) => apiClient.get(`/vital-records/stats${qs(params)}`);

// ---- Birth records ----
export const listBirthRecords = (params) => apiClient.get(`/vital-records/births${qs(params)}`);
export const getBirthRecord = (id) => apiClient.get(`/vital-records/births/${id}`);
export const createBirthRecord = (data) => apiClient.post('/vital-records/births', data);
export const updateBirthRecord = (id, data) => apiClient.put(`/vital-records/births/${id}`, data);
export const issueBirthCertificate = (id, data = {}) =>
  apiClient.post(`/vital-records/births/${id}/certificate`, data);
export const cancelBirthRecord = (id) => apiClient.delete(`/vital-records/births/${id}`);

// ---- Death records ----
export const listDeathRecords = (params) => apiClient.get(`/vital-records/deaths${qs(params)}`);
export const getDeathRecord = (id) => apiClient.get(`/vital-records/deaths/${id}`);
export const createDeathRecord = (data) => apiClient.post('/vital-records/deaths', data);
export const updateDeathRecord = (id, data) => apiClient.put(`/vital-records/deaths/${id}`, data);
export const issueDeathCertificate = (id, data = {}) =>
  apiClient.post(`/vital-records/deaths/${id}/certificate`, data);
export const cancelDeathRecord = (id) => apiClient.delete(`/vital-records/deaths/${id}`);
