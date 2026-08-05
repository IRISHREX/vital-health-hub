import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v);
  });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const listEstimates = (params) => apiClient.get(`/estimates${qs(params)}`);
export const getEstimate = (id) => apiClient.get(`/estimates/${id}`);
export const createEstimate = (data) => apiClient.post('/estimates', data);
export const updateEstimate = (id, data) => apiClient.put(`/estimates/${id}`, data);
export const cancelEstimate = (id) => apiClient.delete(`/estimates/${id}`);
export const searchEstimateCatalog = (params) => apiClient.get(`/estimates/catalog-search${qs(params)}`);

export const ESTIMATE_MODULES = ['opd', 'ipd', 'appointment', 'lab', 'radiology', 'pharmacy', 'ot', 'other'];
export const ESTIMATE_STATUSES = ['draft', 'shared', 'approved', 'converted', 'expired', 'cancelled'];

/** Pure: totals for an in-progress estimate form. */
export const computeEstimateTotals = (items = [], discountAmount = 0, taxAmount = 0) => {
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const subtotal = round2(
    items.reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0)
  );
  const discount = round2(discountAmount);
  const tax = round2(taxAmount);
  return {
    subtotal,
    discountAmount: discount,
    taxAmount: tax,
    totalAmount: Math.max(0, round2(subtotal - discount + tax)),
  };
};
