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

export const updateVital = (id, data) => {
  return apiClient.put(`/vitals/${id}`, data);
};

export const deleteVital = (id) => {
  return apiClient.delete(`/vitals/${id}`);
};

export const getVitalTrends = (patientId, hours = 24) => {
  return apiClient.get(`/vitals/patient/${patientId}/trends?hours=${hours}`);
};

export const getVitalsFeed = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const q = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get(`/vitals${q}`);
};
