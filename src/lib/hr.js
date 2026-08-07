import { apiClient } from './api-client';

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, v);
  });
  const q = search.toString();
  return q ? `?${q}` : '';
};

// ---- Employees ----
export const listEmployees = (params) => apiClient.get(`/hr/employees${qs(params)}`);
export const getEmployee = (id) => apiClient.get(`/hr/employees/${id}`);
export const createEmployee = (data) => apiClient.post('/hr/employees', data);
export const updateEmployee = (id, data) => apiClient.put(`/hr/employees/${id}`, data);
export const deactivateEmployee = (id) => apiClient.delete(`/hr/employees/${id}`);
export const rotateEmployeeCard = (id) => apiClient.post(`/hr/employees/${id}/rotate-card`, {});
export const bulkRotateEmployeeCards = (data) => apiClient.post('/hr/employees/bulk-rotate-cards', data || {});
export const markCardIssued = (id) => apiClient.post(`/hr/employees/${id}/card-issued`, {});

// ---- Leave ----
export const listLeaveRequests = (params) => apiClient.get(`/hr/leaves${qs(params)}`);
export const createLeaveRequest = (data) => apiClient.post('/hr/leaves', data);
export const decideLeaveRequest = (id, data) => apiClient.post(`/hr/leaves/${id}/decision`, data);

// ---- Payroll ----
export const listPayrollRuns = (params) => apiClient.get(`/hr/payroll${qs(params)}`);
export const getPayrollRun = (id) => apiClient.get(`/hr/payroll/${id}`);
export const generatePayrollRun = (data) => apiClient.post('/hr/payroll', data);
export const updatePayslip = (runId, slipId, data) => apiClient.put(`/hr/payroll/${runId}/slips/${slipId}`, data);
export const finalizePayrollRun = (id) => apiClient.post(`/hr/payroll/${id}/finalize`, {});
export const payPayslip = (runId, slipId, data) => apiClient.post(`/hr/payroll/${runId}/slips/${slipId}/pay`, data);

export const getHrSummary = () => apiClient.get('/hr/summary');

// ---- Attendance via ID card ----
export const scanEmployeeCard = (data) => apiClient.post('/attendance/card-scan', data);

export const EMPLOYEE_MODULES = [
  'general', 'opd', 'ipd', 'lab', 'radiology', 'pharmacy', 'ot',
  'nursing', 'administration', 'housekeeping', 'billing',
];
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern', 'visiting'];
export const SALARY_MODES = ['monthly', 'daily', 'hourly'];
export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'];

export const employeeFullName = (employee) =>
  `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || '—';

/** QR payload printed on the ID card. */
export const buildCardPayload = (employee) =>
  employee?.cardToken ? `EMP|${employee.employeeCode}|${employee.cardToken}` : '';

/** Pure: full monthly gross from a salary structure. */
export const fullGross = (salary = {}) =>
  Math.round(((Number(salary.basic) || 0) + (Number(salary.hra) || 0) + (Number(salary.allowances) || 0)) * 100) / 100;

export const titleCase = (value) =>
  String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
