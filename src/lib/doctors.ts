import { apiClient } from './api-client';

const formatDoctorData = (doctorData) => {
  const rawFee = doctorData?.consultationFee;
  const opd =
    typeof rawFee === "object" && rawFee !== null
      ? Number(rawFee.opd)
      : Number(rawFee);
  const ipd =
    typeof rawFee === "object" && rawFee !== null
      ? Number(rawFee.ipd)
      : Number.isFinite(opd)
        ? opd * 2
        : NaN;
  const safeOpd = Number.isFinite(opd) ? opd : 500;
  const safeIpd = Number.isFinite(ipd) ? ipd : safeOpd * 2;

  return {
    ...doctorData,
    consultationFee: {
      opd: safeOpd,
      ipd: safeIpd
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
