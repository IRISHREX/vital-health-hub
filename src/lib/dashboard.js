import { apiClient } from './api-client';

export const getDashboard = async (role, params = {}) => {
  const query = new URLSearchParams();
  if (role) query.set('role', role);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const q = query.toString() ? `?${query.toString()}` : '';
  return await apiClient.get(`/dashboard${q}`);
};
