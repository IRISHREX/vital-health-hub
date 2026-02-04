import { apiClient } from './api-client';

export const getPatientVitals = (patientId, limit = 20) => {
  return apiClient.get(`/vitals/patient/${patientId}?limit=${limit}`);
};

export const getLatestVital = (patientId) => {
  return apiClient.get(`/vitals/latest?patientId=${patientId}`);
};

export const createVital = (data) => {
  return apiClient.post('/vitals', data);
};

export const getVitalTrends = (patientId, days = 7) => {
  return apiClient.get(`/vitals/trends?patientId=${patientId}&days=${days}`);
};