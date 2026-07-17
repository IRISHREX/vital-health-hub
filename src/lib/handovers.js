import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.append(k, v); });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const listHandovers = (params) => apiClient.get(`/handovers${qs(params)}`);
export const createHandover = (data) => apiClient.post('/handovers', data);
export const respondHandover = (id, decision, notes) => apiClient.post(`/handovers/${id}/respond`, { decision, notes });
