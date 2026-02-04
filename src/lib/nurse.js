import { apiClient } from './api-client';

export const getAssignedPatients = async (nurseId) => {
  const q = nurseId ? `?nurseId=${nurseId}` : '';
  return await apiClient.get(`/nurse/patients${q}`);
};

export const getAssignedAppointments = async (nurseId) => {
  const q = nurseId ? `?nurseId=${nurseId}` : '';
  return await apiClient.get(`/nurse/appointments${q}`);
};
