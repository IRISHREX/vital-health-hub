import { apiClient } from './api-client';

export const getUsers = async () => {
  return await apiClient.get('/users');
};

export const getUserById = async (id) => {
  return await apiClient.get(`/users/${id}`);
};

export const updateUser = async (id, userData) => {
  return await apiClient.put(`/users/${id}`, userData);
};

export const deleteUser = async (id) => {
  return await apiClient.delete(`/users/${id}`);
};

export const getNurses = async () => {
  return await apiClient.get('/users/nurses');
};
