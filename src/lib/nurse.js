import { apiClient } from './api-client';

export const getAssignedPatients = async (nurseId) => {
  const q = nurseId ? `?nurseId=${nurseId}` : '';
  return await apiClient.get(`/nurse/patients${q}`);
};

export const getAssignedAppointments = async (nurseId) => {
  const q = nurseId ? `?nurseId=${nurseId}` : '';
  return await apiClient.get(`/nurse/appointments${q}`);
};

export const assignRoomToNurse = async ({ nurseId, ward, floor, roomNumber }) => {
  return await apiClient.post('/nurse/assign-room', { nurseId, ward, floor, roomNumber });
};

export const handoverPatient = async ({ patientId, toNurseId }) => {
  return await apiClient.post('/nurse/handover', { patientId, toNurseId });
};
