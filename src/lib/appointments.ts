import { apiClient } from './api-client';

export const createAppointment = async (appointmentData) => {
  return await apiClient.post('/appointments', appointmentData);
};

export const getAppointments = async () => {
  return await apiClient.get('/appointments');
};

export const getAppointmentById = async (id) => {
  return await apiClient.get(`/appointments/${id}`);
};

export const updateAppointment = async (id, appointmentData) => {
  return await apiClient.put(`/appointments/${id}`, appointmentData);
};

export const deleteAppointment = async (id) => {
  return await apiClient.delete(`/appointments/${id}`);
};
