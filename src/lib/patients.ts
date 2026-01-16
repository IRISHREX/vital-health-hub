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

export const updatePatient = async (id, patientData) => {
  return await apiClient.put(`/patients/${id}`, patientData);
};

export const deletePatient = async (id) => {
  return await apiClient.delete(`/patients/${id}`);
};
