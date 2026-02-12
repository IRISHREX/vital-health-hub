import { apiClient } from './api-client';

export const createPatient = async (patientData) => {
  return await apiClient.post('/patients', patientData);
};

export const getPatients = async () => {
  return await apiClient.get('/patients');
};

export const getPatientById = async (id) => {
  return await apiClient.get(`/patients/${id}`);
};

export const getPatientHistory = async (id, params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return await apiClient.get(`/patients/${id}/history${query ? `?${query}` : ""}`);
};

export const updatePatient = async (id, patientData) => {
  return await apiClient.put(`/patients/${id}`, patientData);
};

export const deletePatient = async (id) => {
  return await apiClient.delete(`/patients/${id}`);
};
