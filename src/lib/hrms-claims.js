import { apiClient } from './api-client';

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, v);
  });
  const q = search.toString();
  return q ? `?${q}` : '';
};

export const listClaims = (params) => apiClient.get(`/hrms/claims${qs(params)}`);
export const getClaim = (id) => apiClient.get(`/hrms/claims/${id}`);
export const createClaim = (data) => apiClient.post('/hrms/claims', data);
export const updateClaim = (id, data) => apiClient.put(`/hrms/claims/${id}`, data);
export const submitClaim = (id) => apiClient.post(`/hrms/claims/${id}/submit`);
export const actOnClaim = (id, data) => apiClient.post(`/hrms/claims/${id}/act`, data);
export const cancelClaim = (id, reason) => apiClient.post(`/hrms/claims/${id}/cancel`, { reason });
export const markClaimPaid = (id, data) => apiClient.post(`/hrms/claims/${id}/mark-paid`, data);
export const extractReceiptText = (text) => apiClient.post('/hrms/claims/extract-receipt', { text });
export const getClaimsMeta = () => apiClient.get('/hrms/claims/meta');
export const getClaimsSummary = (params) => apiClient.get(`/hrms/claims/summary${qs(params)}`);

export const listPolicies = () => apiClient.get('/hrms/claims/policies');
export const upsertPolicy = (data) => apiClient.post('/hrms/claims/policies', data);
export const deletePolicy = (id) => apiClient.delete(`/hrms/claims/policies/${id}`);

export const CLAIM_TYPES = [
  'cme', 'license_renewal', 'travel_home_visit', 'uniform_scrub_stipend',
  'conference', 'relocation', 'medical', 'other',
];

export const CLAIM_STATUSES = [
  'draft', 'submitted', 'ward_incharge_approved', 'dept_head_approved',
  'finance_approved', 'rejected', 'paid', 'cancelled',
];

export const APPROVAL_STAGES = ['ward_incharge', 'dept_head', 'finance', 'done'];

export const STAFF_CATEGORIES = [
  'doctor', 'nurse', 'paramedic', 'administrative', 'lab_tech',
  'radiology_tech', 'pharmacy_staff', 'housekeeping', 'locum_contract', 'other',
];

export const titleCase = (value) =>
  String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Pure: badge variant for a claim status. */
export const statusVariant = (status) => {
  switch (status) {
    case 'paid': return 'default';
    case 'rejected':
    case 'cancelled': return 'destructive';
    case 'draft': return 'outline';
    default: return 'secondary';
  }
};

/** Pure: human label for the current approval stage. */
export const stageLabel = (stage) => {
  if (!stage || stage === 'done') return 'Completed';
  return `${titleCase(stage)} approval`;
};

/** Pure: sum of amount + tax across line items. */
export const claimTotal = (lineItems = []) =>
  Math.round(lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0) + (Number(li.taxAmount) || 0), 0) * 100) / 100;

/** Pure, regex based fallback mirror of backend extraction (used for instant preview). */
export const extractLineItemsLocally = (text) => {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const amountRegex = /(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr)?$/i;
  const dateRegex = /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  const items = [];
  lines.forEach((line) => {
    const amountMatch = line.match(amountRegex);
    if (!amountMatch) return;
    const amount = Number(String(amountMatch[1]).replace(/,/g, ''));
    if (!amount || Number.isNaN(amount)) return;
    let description = line.slice(0, amountMatch.index).trim().replace(/[-:,]+$/, '').trim();
    const dateMatch = line.match(dateRegex);
    let incurredOn = '';
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]);
      if (!Number.isNaN(parsed.getTime())) incurredOn = parsed.toISOString().slice(0, 10);
      description = description.replace(dateMatch[1], '').trim().replace(/[-:,]+$/, '').trim();
    }
    if (!description) description = 'Item';
    items.push({ description, amount, incurredOn });
  });
  return items;
};
