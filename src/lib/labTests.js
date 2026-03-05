import { apiClient } from './api-client';

// ====== Catalog ======
export const getLabCatalog = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/lab-tests/catalog${query ? `?${query}` : ''}`);
};
export const getLabCatalogItem = (id) => apiClient.get(`/lab-tests/catalog/${id}`);
export const createLabCatalogItem = (data) => apiClient.post('/lab-tests/catalog', data);
export const updateLabCatalogItem = (id, data) => apiClient.put(`/lab-tests/catalog/${id}`, data);
export const deleteLabCatalogItem = (id) => apiClient.delete(`/lab-tests/catalog/${id}`);

// ====== Lab Tests (Orders) ======
export const getLabTests = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/lab-tests${query ? `?${query}` : ''}`);
};
export const getLabTestById = (id) => apiClient.get(`/lab-tests/${id}`);
export const createLabTest = (data) => apiClient.post('/lab-tests', data);
export const updateLabTest = (id, data) => apiClient.put(`/lab-tests/${id}`, data);
export const deleteLabTest = (id) => apiClient.delete(`/lab-tests/${id}`);

// ====== Sample Workflow ======
export const collectSample = (id) => apiClient.post(`/lab-tests/${id}/collect-sample`);
export const receiveSample = (id) => apiClient.post(`/lab-tests/${id}/receive-sample`);
export const rejectSample = (id, reason) => apiClient.post(`/lab-tests/${id}/reject-sample`, { reason });
export const startProcessing = (id) => apiClient.post(`/lab-tests/${id}/start-processing`);

// ====== Results ======
export const enterResults = (id, data) => apiClient.post(`/lab-tests/${id}/enter-results`, data);
export const verifyResults = (id) => apiClient.post(`/lab-tests/${id}/verify`);
export const deliverReport = (id) => apiClient.post(`/lab-tests/${id}/deliver`);

// ====== Stats ======
export const getLabStats = () => apiClient.get('/lab-tests/stats');

// ====== Invoice ======
export const generateLabInvoice = (testIds) => apiClient.post('/lab-tests/generate-invoice', { testIds });
