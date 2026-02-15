import { apiClient } from "./api-client";

const toQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

// OT Rooms
export const getOTRooms = (params) => apiClient.get(`/ot/rooms${toQuery(params)}`);
export const createOTRoom = (data) => apiClient.post('/ot/rooms', data);
export const updateOTRoom = (id, data) => apiClient.put(`/ot/rooms/${id}`, data);
export const deleteOTRoom = (id) => apiClient.delete(`/ot/rooms/${id}`);

// Surgeries
export const getSurgeries = (params) => apiClient.get(`/ot/surgeries${toQuery(params)}`);
export const getSurgeryById = (id) => apiClient.get(`/ot/surgeries/${id}`);
export const createSurgery = (data) => apiClient.post('/ot/surgeries', data);
export const updateSurgery = (id, data) => apiClient.put(`/ot/surgeries/${id}`, data);
export const deleteSurgery = (id, reason) => apiClient.delete(`/ot/surgeries/${id}`, { data: { reason } });

// Workflow
export const approveSurgery = (id) => apiClient.post(`/ot/surgeries/${id}/approve`);
export const scheduleSurgery = (id, data) => apiClient.post(`/ot/surgeries/${id}/schedule`, data);
export const updateChecklist = (id, data) => apiClient.post(`/ot/surgeries/${id}/checklist`, data);
export const patientInOT = (id) => apiClient.post(`/ot/surgeries/${id}/patient-in-ot`);
export const startAnesthesia = (id, data) => apiClient.post(`/ot/surgeries/${id}/start-anesthesia`, data);
export const startSurgeryAction = (id) => apiClient.post(`/ot/surgeries/${id}/start`);
export const endSurgeryAction = (id, data) => apiClient.post(`/ot/surgeries/${id}/end`, data);
export const moveToRecovery = (id, data) => apiClient.post(`/ot/surgeries/${id}/recovery`, data);
export const completeRecovery = (id, data) => apiClient.post(`/ot/surgeries/${id}/complete-recovery`, data);
export const completeSurgeryAction = (id) => apiClient.post(`/ot/surgeries/${id}/complete`);

// Stats & Schedule
export const getOTStats = () => apiClient.get('/ot/stats');
export const getOTSchedule = (params) => apiClient.get(`/ot/schedule${toQuery(params)}`);

// Invoice
export const generateOTInvoice = (surgeryId) => apiClient.post('/ot/generate-invoice', { surgeryId });
