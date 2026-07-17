import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.append(k, v); });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const listIndents = (params) => apiClient.get(`/medicine-indents${qs(params)}`);
export const createIndent = (data) => apiClient.post('/medicine-indents', data);
export const issueIndent = (id, items) => apiClient.post(`/medicine-indents/${id}/issue`, { items });
export const returnIndent = (id, items) => apiClient.post(`/medicine-indents/${id}/return`, { items });
export const cancelIndent = (id) => apiClient.post(`/medicine-indents/${id}/cancel`);
