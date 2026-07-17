import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.append(k, v); });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const listNursingCharges = (params) => apiClient.get(`/nursing-charges${qs(params)}`);
export const createNursingCharge = (data) => apiClient.post('/nursing-charges', data);
export const cancelNursingCharge = (id, reason) => apiClient.post(`/nursing-charges/${id}/cancel`, { reason });
