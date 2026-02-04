import { apiClient } from './api-client';

export const getDashboard = async (role) => {
  const q = role ? `?role=${role}` : '';
  return await apiClient.get(`/dashboard${q}`);
};
