import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.append(k, v); });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const listFluidIO = (params) => apiClient.get(`/fluid-io${qs(params)}`);
export const summaryFluidIO = (params) => apiClient.get(`/fluid-io/summary${qs(params)}`);
export const createFluidIO = (data) => apiClient.post('/fluid-io', data);
export const deleteFluidIO = (id) => apiClient.delete(`/fluid-io/${id}`);
