import { apiClient } from './api-client';

// Rules (admin)
export const listApprovalRules = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient.get(`/approvals/rules${qs ? `?${qs}` : ''}`);
};
export const createApprovalRule = (data) => apiClient.post('/approvals/rules', data);
export const updateApprovalRule = (id, data) => apiClient.put(`/approvals/rules/${id}`, data);
export const deleteApprovalRule = (id) => apiClient.delete(`/approvals/rules/${id}`);

// Lookup applicable rule for a module+action
export const findApplicableRule = (module, action) =>
  apiClient.get(`/approvals/applicable?module=${encodeURIComponent(module)}&action=${encodeURIComponent(action)}`);

// Requests
export const listApprovalRequests = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient.get(`/approvals/requests${qs ? `?${qs}` : ''}`);
};
export const createApprovalRequest = (data) => apiClient.post('/approvals/requests', data);
export const respondApprovalRequest = (id, data) =>
  apiClient.patch(`/approvals/requests/${id}/respond`, data);

export const escalateOverdueApprovals = () => apiClient.post('/approvals/escalate', {});

export const APPROVAL_MODULES = [
  'dashboard', 'beds', 'admissions', 'patients', 'doctors',
  'nurses', 'appointments', 'facilities', 'billing', 'invoices',
  'reports', 'tasks', 'lab', 'pharmacy', 'radiology', 'ot', 'settings'
];

export const APPROVAL_ACTIONS = ['create', 'edit', 'delete', 'custom'];

export const APPROVAL_ROLES = [
  'super_admin', 'hospital_admin', 'doctor', 'head_nurse',
  'nurse', 'receptionist', 'billing_staff', 'pharmacist'
];
