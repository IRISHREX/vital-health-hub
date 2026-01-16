import { apiClient } from './api-client';

export const createDoctor = async (doctorData) => {
  return await apiClient.post('/doctors', doctorData);
};

export const getDoctors = async () => {
  return await apiClient.get('/doctors');
};

export const getDoctorById = async (id) => {
  return await apiClient.get(`/doctors/${id}`);
};

export const updateDoctor = async (id, doctorData) => {
  return await apiClient.put(`/doctors/${id}`, doctorData);
};

export const deleteDoctor = async (id) => {
  return await apiClient.delete(`/doctors/${id}`);
};
