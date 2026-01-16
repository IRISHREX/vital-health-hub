import { apiClient, removeAuthToken, removeUser } from './api-client';

export const loginApi = async (credentials) => {
  return apiClient.post('/auth/login', credentials);
};

export const registerApi = async (userData) => {
  return apiClient.post('/auth/register', userData);
};

export const logout = () => {
  removeAuthToken();
  removeUser();
};

export const getMe = async () => {
  return await apiClient.get('/auth/me');
};

export const updateProfile = async (profileData) => {
  return await apiClient.put('/auth/profile', profileData);
};

export const changePassword = async (passwordData) => {
  return await apiClient.put('/auth/password', passwordData);
};

export const forgotPassword = async (email) => {
  return await apiClient.post('/auth/forgot-password', { email });
};

export const resetPassword = async (passwordData) => {
  return await apiClient.post('/auth/reset-password', passwordData);
};
