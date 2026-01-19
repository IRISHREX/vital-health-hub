import { apiClient } from './api-client';

export const createPatient = async (patientData: any) => {
  return await apiClient.post('/patients', patientData);
};

export const getPatients = async () => {
  return await apiClient.get('/patients');
};

export const getPatientById = async (id: string) => {
  return await apiClient.get(`/patients/${id}`);
};

export const updatePatient = async (id: string, patientData: any) => {
  return await apiClient.put(`/patients/${id}`, patientData);
};

// Deleting a patient also deletes associated invoice (handled by backend)
export const deletePatient = async (id: string) => {
  return await apiClient.delete(`/patients/${id}`);
};
