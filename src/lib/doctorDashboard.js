import { apiClient } from './api-client';

export const getDoctorProfile = (id) => apiClient.get(`/doctor-dashboard/${id}/profile`);
export const getDoctorRevenue = (id, period = 30) => apiClient.get(`/doctor-dashboard/${id}/revenue?period=${period}`);
