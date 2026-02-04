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

// Get bed statistics
export const getBedStats = async () => {
  return await apiClient.get('/beds/stats');
};

// Update bed status
export const updateBedStatus = async (id, status) => {
  return await apiClient.patch(`/beds/${id}/status`, { status });
};

// Assign bed to patient
export const assignBed = async (id, patientId, admissionId) => {
  return await apiClient.post(`/beds/${id}/assign`, { patientId, admissionId });
};

// Release bed
export const releaseBed = async (id) => {
  return await apiClient.post(`/beds/${id}/release`);
};

// Assign a nurse in charge for a bed/room (admin)
export const assignNurse = async (id, nurseId) => {
  return await apiClient.patch(`/beds/${id}/assign-nurse`, { nurseId });
};
