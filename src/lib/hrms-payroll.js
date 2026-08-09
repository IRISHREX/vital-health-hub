import { apiClient } from './api-client';

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, v);
  });
  const q = search.toString();
  return q ? `?${q}` : '';
};

// ---- Pay Profiles ----
export const listPayProfiles = (params) => apiClient.get(`/hrms/payroll/pay-profiles${qs(params)}`);
export const getPayProfile = (employeeId) => apiClient.get(`/hrms/payroll/pay-profiles/${employeeId}`);
export const savePayProfile = (employeeId, data) => apiClient.put(`/hrms/payroll/pay-profiles/${employeeId}`, data);
export const deletePayProfile = (employeeId) => apiClient.delete(`/hrms/payroll/pay-profiles/${employeeId}`);

// ---- Policy ----
export const getPayrollPolicy = () => apiClient.get('/hrms/payroll/policy');
export const updatePayrollPolicy = (data) => apiClient.put('/hrms/payroll/policy', data);

// ---- Runs ----
export const listPayrollRuns = (params) => apiClient.get(`/hrms/payroll/runs${qs(params)}`);
export const getPayrollRun = (id) => apiClient.get(`/hrms/payroll/runs/${id}`);
export const generatePayrollRun = (data) => apiClient.post('/hrms/payroll/runs', data);
export const recalculatePayrollRun = (id) => apiClient.post(`/hrms/payroll/runs/${id}/recalculate`, {});
export const updatePayslip = (runId, slipId, data) => apiClient.put(`/hrms/payroll/runs/${runId}/slips/${slipId}`, data);
export const markSlipPaid = (runId, slipId, data) => apiClient.post(`/hrms/payroll/runs/${runId}/slips/${slipId}/pay`, data);
export const transitionRunStatus = (id, status) => apiClient.post(`/hrms/payroll/runs/${id}/status`, { status });

export const getEmployeePayslips = (employeeId) => apiClient.get(`/hrms/payroll/employees/${employeeId}/payslips`);

// ---- Constants ----
export const PAY_MODELS = ['fixed_monthly', 'hourly', 'per_procedure', 'per_diem_locum', 'retainer'];
export const PAY_MODEL_LABELS = {
  fixed_monthly: 'Fixed Monthly',
  hourly: 'Hourly',
  per_procedure: 'Per Procedure',
  per_diem_locum: 'Per-Diem / Locum',
  retainer: 'Retainer',
};
export const TAX_REGIMES = ['slab', 'flat'];
export const RUN_STATUSES = ['draft', 'review', 'finalized', 'paid', 'cancelled'];
export const PAYMENT_MODES = ['bank_transfer', 'cash', 'cheque', 'upi'];

export const STATUS_BADGE_VARIANT = {
  draft: 'secondary',
  review: 'outline',
  finalized: 'default',
  paid: 'default',
  cancelled: 'destructive',
};

export const titleCase = (value) =>
  String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const formatCurrency = (value) =>
  `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const employeeFullName = (employee) =>
  `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || '—';

export const NEXT_STATUS_ACTIONS = {
  draft: [{ status: 'review', label: 'Send for Review' }, { status: 'cancelled', label: 'Cancel' }],
  review: [{ status: 'draft', label: 'Back to Draft' }, { status: 'finalized', label: 'Finalize' }, { status: 'cancelled', label: 'Cancel' }],
  finalized: [{ status: 'paid', label: 'Mark Fully Paid' }, { status: 'cancelled', label: 'Cancel' }],
  paid: [],
  cancelled: [],
};
