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
export const listHrmsEmployees = (params) => apiClient.get(`/hrms/employees${qs(params)}`);
export const getHrmsEmployee = (id) => apiClient.get(`/hrms/employees/${id}`);
export const createHrmsEmployee = (data) => apiClient.post('/hrms/employees', data);
export const updateHrmsEmployee = (id, data) => apiClient.put(`/hrms/employees/${id}`, data);
export const deactivateHrmsEmployee = (id) => apiClient.delete(`/hrms/employees/${id}`);

// ---- Sub-array entries ----
const subApi = (path) => ({
  add: (id, data) => apiClient.post(`/hrms/employees/${id}/${path}`, data),
  update: (id, itemId, data) => apiClient.put(`/hrms/employees/${id}/${path}/${itemId}`, data),
  remove: (id, itemId) => apiClient.delete(`/hrms/employees/${id}/${path}/${itemId}`),
});

export const licensesApi = subApi('licenses');
export const certificationsApi = subApi('certifications');
export const immunizationsApi = subApi('immunizations');
export const healthChecksApi = subApi('health-checks');
export const hazardExposuresApi = subApi('hazard-exposures');
export const privilegesApi = subApi('privileges');

// ---- Compliance ----
export const getComplianceDashboard = (params) => apiClient.get(`/hrms/employees/compliance${qs(params)}`);
export const runComplianceAlerts = () => apiClient.post('/hrms/employees/compliance/run-alerts', {});

// ---- Constants / labels ----
export const STAFF_CATEGORIES = [
  'doctor', 'nurse', 'paramedic', 'administrative', 'lab_tech',
  'radiology_tech', 'pharmacy_staff', 'housekeeping', 'locum_contract', 'other',
];
export const LICENSE_TYPES = ['medical_council', 'dea', 'nursing_council', 'pharmacy', 'radiology', 'other'];
export const IMMUNIZATION_VACCINES = ['hep_b', 'influenza', 'covid19', 'tetanus', 'mmr', 'other'];
export const HEALTH_CHECK_TYPES = ['annual', 'pre_employment', 'post_exposure', 'fitness'];
export const HAZARD_EXPOSURE_TYPES = ['needle_stick', 'radiation', 'chemical', 'biohazard', 'other'];
export const PRIVILEGE_LEVELS = ['assist', 'independent', 'supervisor'];
export const PRIVILEGE_STATUSES = ['active', 'suspended', 'revoked'];
export const COMPLIANCE_BUCKETS = ['overdue', 'due_30', 'due_60', 'due_90', 'ok'];

export const titleCase = (value) =>
  String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const employeeFullName = (employee) =>
  `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || '—';

/** Pure: label for a compliance bucket, used by both dashboard and badges. */
export const BUCKET_LABELS = {
  overdue: 'Overdue',
  due_30: 'Due in 30 days',
  due_60: 'Due in 60 days',
  due_90: 'Due in 90 days',
  ok: 'OK',
};

/** Pure: shadcn Badge variant per compliance severity (no hardcoded colors). */
export const bucketBadgeVariant = (bucket) => {
  if (bucket === 'overdue') return 'destructive';
  if (bucket === 'due_30') return 'destructive';
  if (bucket === 'due_60') return 'secondary';
  if (bucket === 'due_90') return 'outline';
  return 'default';
};

/** Pure: mirror of the backend bucketing so the UI can preview status client-side. */
export const bucketForExpiry = (expiresOn, now = new Date()) => {
  if (!expiresOn) return null;
  const d = new Date(expiresOn);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (days < 0) return 'overdue';
  if (days <= 30) return 'due_30';
  if (days <= 60) return 'due_60';
  if (days <= 90) return 'due_90';
  return 'ok';
};
