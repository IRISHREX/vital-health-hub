import { apiClient } from './api-client';

export const getPatientVitals = (patientId, limit = 20) => {
  return apiClient.get(`/vitals/patient/${patientId}?limit=${limit}`);
};

export const getLatestVital = (patientId) => {
  return apiClient.get(`/vitals/patient/${patientId}/latest`);
};

export const createVital = (data) => {
  return apiClient.post('/vitals', data);
};

export const getVitalTrends = (patientId, hours = 24) => {
  return apiClient.get(`/vitals/patient/${patientId}/trends?hours=${hours}`);
};
