import { apiClient } from './api-client';

export const createBed = async (bedData) => {
  return await apiClient.post('/beds', bedData);
};

export const getBeds = async () => {
  return await apiClient.get('/beds');
};

export const getBedById = async (id) => {
  return await apiClient.get(`/beds/${id}`);
};

export const updateBed = async (id, bedData) => {
  return await apiClient.put(`/beds/${id}`, bedData);
};

export const deleteBed = async (id) => {
  return await apiClient.delete(`/beds/${id}`);
};
