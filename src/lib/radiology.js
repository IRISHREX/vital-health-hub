import { apiClient } from './api-client';

// CRUD
export const getRadiologyOrders = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/radiology${query ? `?${query}` : ''}`);
};
export const getRadiologyOrderById = (id) => apiClient.get(`/radiology/${id}`);
export const createRadiologyOrder = (data) => apiClient.post('/radiology', data);
export const updateRadiologyOrder = (id, data) => apiClient.put(`/radiology/${id}`, data);
export const deleteRadiologyOrder = (id) => apiClient.delete(`/radiology/${id}`);

// Workflow
export const scheduleOrder = (id, data) => apiClient.post(`/radiology/${id}/schedule`, data);
export const startStudy = (id) => apiClient.post(`/radiology/${id}/start`);
export const completeStudy = (id, data) => apiClient.post(`/radiology/${id}/complete`, data);

// Report
export const createReport = (id, data) => apiClient.post(`/radiology/${id}/report`, data);
export const verifyReport = (id) => apiClient.post(`/radiology/${id}/verify`);
export const deliverRadiologyReport = (id) => apiClient.post(`/radiology/${id}/deliver`);

// Stats
export const getRadiologyStats = () => apiClient.get('/radiology/stats');

// Invoice
export const generateRadiologyInvoice = (orderIds) => apiClient.post('/radiology/generate-invoice', { orderIds });
