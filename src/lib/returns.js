import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.append(k, v); });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const listReturns = (params) => apiClient.get(`/returns${qs(params)}`);
export const createReturn = (data) => apiClient.post('/returns', data);
export const processReturn = (id, decision) => apiClient.post(`/returns/${id}/process`, { decision });
