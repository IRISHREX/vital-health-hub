import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.append(k, v); });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const listPAC = (params) => apiClient.get(`/pac${qs(params)}`);
export const createPAC = (data) => apiClient.post('/pac', data);
export const updatePAC = (id, data) => apiClient.put(`/pac/${id}`, data);
export const clearancePAC = (id, data) => apiClient.post(`/pac/${id}/clearance`, data);
