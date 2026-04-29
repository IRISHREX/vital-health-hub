import { apiClient } from './api-client';

export const listEvents = (from, to) => {
  const qs = new URLSearchParams();
  if (from) qs.set('from', new Date(from).toISOString());
  if (to)   qs.set('to', new Date(to).toISOString());
  const q = qs.toString();
  return apiClient.get(`/scheduler/events${q ? `?${q}` : ''}`);
};

export const createEvent  = (payload) => apiClient.post('/scheduler/events', payload);
export const updateEvent  = (id, payload) => apiClient.put(`/scheduler/events/${id}`, payload);
export const deleteEvent  = (id) => apiClient.delete(`/scheduler/events/${id}`);
export const respondInvite = (id, status) => apiClient.post(`/scheduler/events/${id}/respond`, { status });

export const createBlock = (payload) => apiClient.post('/scheduler/blocks', payload);

export const getDoctorSlots = (doctorId, date, duration = 30) => {
  const qs = new URLSearchParams({ date: new Date(date).toISOString(), duration: String(duration) });
  return apiClient.get(`/scheduler/doctors/${doctorId}/slots?${qs.toString()}`);
};

export const bookAppointment = (payload) => apiClient.post('/scheduler/appointments', payload);

export const ALLOWED_DURATIONS = [10, 20, 30];
