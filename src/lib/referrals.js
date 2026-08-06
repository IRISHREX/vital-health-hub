import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v);
  });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const listReferrers = (params) => apiClient.get(`/referrals${qs(params)}`);
export const createReferrer = (data) => apiClient.post('/referrals', data);
export const updateReferrer = (id, data) => apiClient.put(`/referrals/${id}`, data);
export const deactivateReferrer = (id) => apiClient.delete(`/referrals/${id}`);
export const getReferrerSummary = (id) => apiClient.get(`/referrals/${id}/summary`);

export const listCommissions = (params) => apiClient.get(`/referrals/commissions${qs(params)}`);
export const updateCommissionStatus = (id, data) =>
  apiClient.put(`/referrals/commissions/${id}/status`, data);
export const attachReferrerToInvoice = (data) => apiClient.post('/referrals/attach-invoice', data);

export const REFERRAL_MODULES = ['opd', 'ipd', 'appointment', 'lab', 'radiology', 'pharmacy', 'ot', 'general'];
export const REFERRER_TYPES = ['doctor', 'staff', 'agent', 'hospital', 'clinic', 'individual', 'other'];
