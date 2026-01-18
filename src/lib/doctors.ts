import { apiClient } from './api-client';

const formatDoctorData = (doctorData) => {
  return {
    ...doctorData,
    consultationFee: {
      opd: doctorData.consultationFee,
      ipd: (doctorData.consultationFee || 500) * 2
    }
  };
};

export const createDoctor = async (doctorData) => {
  return await apiClient.post('/doctors', formatDoctorData(doctorData));
};

export const getDoctors = async () => {
  return await apiClient.get('/doctors');
};

export const getDoctorById = async (id) => {
  return await apiClient.get(`/doctors/${id}`);
};

export const updateDoctor = async (id, doctorData) => {
  return await apiClient.put(`/doctors/${id}`, formatDoctorData(doctorData));
};

export const deleteDoctor = async (id) => {
  return await apiClient.delete(`/doctors/${id}`);
};
export const updateAvailability = async (id, availabilityStatus) => {
  return await apiClient.patch(`/doctors/${id}/availability`, { availabilityStatus });
};