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

// Get appointment statistics
export const getAppointmentStats = async () => {
  return await apiClient.get('/appointments/stats');
};

// Get today's appointments
export const getTodayAppointments = async () => {
  return await apiClient.get('/appointments/today');
};

// Get doctor's schedule for a specific date
export const getDoctorSchedule = async (doctorId, date) => {
  return await apiClient.get(`/appointments/schedule/${doctorId}?date=${date}`);
};

// Update appointment status
export const updateAppointmentStatus = async (id, statusData) => {
  return await apiClient.patch(`/appointments/${id}/status`, statusData);
};

// Cancel appointment
export const cancelAppointment = async (id, reason) => {
  return await apiClient.post(`/appointments/${id}/cancel`, { reason });
};
