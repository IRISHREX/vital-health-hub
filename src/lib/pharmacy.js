import { apiClient } from "./api-client";

const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.append(k, v); });
  const q = s.toString();
  return q ? `?${q}` : '';
};

// Stats
export const getPharmacyStats = () => apiClient.get('/pharmacy/stats');

// Medicines
export const getMedicines = (params) => apiClient.get(`/pharmacy/medicines${qs(params)}`);
export const getMedicine = (id) => apiClient.get(`/pharmacy/medicines/${id}`);
export const createMedicine = (data) => apiClient.post('/pharmacy/medicines', data);
export const updateMedicine = (id, data) => apiClient.put(`/pharmacy/medicines/${id}`, data);
export const deleteMedicine = (id) => apiClient.delete(`/pharmacy/medicines/${id}`);

// Stock
export const adjustStock = (data) => apiClient.post('/pharmacy/stock/adjust', data);
export const getStockHistory = (params) => apiClient.get(`/pharmacy/stock/history${qs(params)}`);
export const requestMedicineStock = (data) => apiClient.post('/pharmacy/medicine-requests', data);

// Prescriptions
export const getPrescriptions = (params) => apiClient.get(`/pharmacy/prescriptions${qs(params)}`);
export const getPrescription = (id) => apiClient.get(`/pharmacy/prescriptions/${id}`);
export const createPrescription = (data) => apiClient.post('/pharmacy/prescriptions', data);
export const updatePrescription = (id, data) => apiClient.put(`/pharmacy/prescriptions/${id}`, data);
export const dispensePrescription = (id, items) => apiClient.post(`/pharmacy/prescriptions/${id}/dispense`, { items });
export const cancelPrescription = (id) => apiClient.patch(`/pharmacy/prescriptions/${id}/cancel`);
export const sharePrescription = (id, data) => apiClient.post(`/pharmacy/prescriptions/${id}/share`, data);
export const getPharmacyInvoices = (params) => apiClient.get(`/pharmacy/invoices${qs(params)}`);
