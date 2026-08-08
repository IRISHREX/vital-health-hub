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
export const reassignApprovalRequest = (id, data) =>
  apiClient.patch(`/approvals/requests/${id}/reassign`, data);

export const escalateOverdueApprovals = () => apiClient.post('/approvals/escalate', {});

export const APPROVAL_MODULES = [
  'dashboard', 'beds', 'admissions', 'patients', 'doctors',
  'nurses', 'appointments', 'facilities', 'billing', 'invoices',
  'reports', 'tasks', 'vitals', 'lab', 'pharmacy', 'radiology', 'ot',
  'settings', 'scheduler', 'payroll', 'expenses', 'estimates', 'services',
  'blood_bank', 'ambulance', 'referrals'
];

export const APPROVAL_ACTIONS = [
  'create', 'edit', 'delete', 'refund', 'discount', 'void',
  'cancel', 'export', 'import', 'publish', 'settings_change',
  'access_request', 'override', 'bulk_delete', 'approve', 'custom'
];

export const MODULE_ACTION_RECOMMENDATIONS = {
  billing: ['refund', 'discount', 'void', 'cancel', 'create', 'edit', 'delete', 'override', 'custom'],
  invoices: ['refund', 'discount', 'void', 'cancel', 'create', 'edit', 'delete', 'custom'],
  settings: ['settings_change', 'access_request', 'override', 'edit', 'custom'],
  pharmacy: ['refund', 'cancel', 'discount', 'create', 'edit', 'delete', 'custom'],
  lab: ['refund', 'cancel', 'create', 'edit', 'delete', 'custom'],
  payroll: ['approve', 'create', 'edit', 'delete', 'custom'],
  expenses: ['approve', 'create', 'edit', 'delete', 'custom'],
  patients: ['delete', 'export', 'override', 'create', 'edit', 'custom'],
  admissions: ['delete', 'override', 'create', 'edit', 'custom'],
  scheduler: ['cancel', 'override', 'create', 'edit', 'delete', 'custom'],
};

export const APPROVAL_ROLES = [
  'super_admin', 'hospital_admin', 'doctor', 'head_nurse',
  'nurse', 'receptionist', 'billing_staff', 'pharmacist'
];
