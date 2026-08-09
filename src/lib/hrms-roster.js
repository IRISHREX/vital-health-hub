import { apiClient } from './api-client';
import { submitPunch as submitPunchApi } from './attendance';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v);
  });
  const q = s.toString();
  return q ? `?${q}` : '';
};

// Shift templates
export const listShiftTemplates = (params) => apiClient.get(`/hrms-roster/shift-templates${qs(params)}`);
export const createShiftTemplate = (data) => apiClient.post('/hrms-roster/shift-templates', data);
export const updateShiftTemplate = (id, data) => apiClient.put(`/hrms-roster/shift-templates/${id}`, data);
export const deleteShiftTemplate = (id) => apiClient.delete(`/hrms-roster/shift-templates/${id}`);

// Roster
export const listRoster = (params) => apiClient.get(`/hrms-roster/roster${qs(params)}`);
export const upsertRosterAssignment = (data) => apiClient.post('/hrms-roster/roster/assignment', data);
export const bulkGenerateRoster = (data) => apiClient.post('/hrms-roster/roster/generate', data);
export const publishRoster = (data) => apiClient.post('/hrms-roster/roster/publish', data);
export const cancelRosterAssignment = (id, data) => apiClient.post(`/hrms-roster/roster/${id}/cancel`, data || {});
export const getHourRollup = (params) => apiClient.get(`/hrms-roster/roster/hour-rollup${qs(params)}`);

// Shift swaps
export const listSwapRequests = (params) => apiClient.get(`/hrms-roster/swaps${qs(params)}`);
export const createSwapRequest = (data) => apiClient.post('/hrms-roster/swaps', data);
export const respondToSwap = (id, accept) => apiClient.post(`/hrms-roster/swaps/${id}/respond`, { accept });
export const decideSwap = (id, approve, note) => apiClient.post(`/hrms-roster/swaps/${id}/decide`, { approve, note });
export const applySwap = (id) => apiClient.post(`/hrms-roster/swaps/${id}/apply`, {});

// Attendance capture (extends existing attendance module)
export const submitPunch = submitPunchApi;

export const SHIFT_KINDS = ['morning', 'evening', 'night', 'split', 'on_call', 'standby'];
export const UNITS = ['er', 'icu', 'ot', 'general_ward', 'opd', 'lab', 'radiology', 'pharmacy', 'admin'];
export const DUTY_TYPES = ['regular', 'on_call', 'standby', 'emergency_callout'];
export const CAPTURE_METHODS = ['qr_scan', 'id_card', 'manual', 'biometric', 'rfid', 'geofence'];

export const shiftKindLabel = (kind) => ({
  morning: 'Morning', evening: 'Evening', night: 'Night',
  split: 'Split', on_call: 'On-call', standby: 'Standby',
}[kind] || kind);

export const unitLabel = (unit) => ({
  er: 'ER', icu: 'ICU', ot: 'OT', general_ward: 'General Ward',
  opd: 'OPD', lab: 'Lab', radiology: 'Radiology', pharmacy: 'Pharmacy', admin: 'Admin',
}[unit] || unit);

export const dutyTypeLabel = (dutyType) => ({
  regular: 'Regular', on_call: 'On-call', standby: 'Standby', emergency_callout: 'Emergency callout',
}[dutyType] || dutyType);

export const captureMethodLabel = (method) => ({
  qr_scan: 'QR scan', id_card: 'ID card', manual: 'Manual', biometric: 'Biometric', rfid: 'RFID', geofence: 'Geofence',
}[method] || method);

/** Pure: local calendar day key (YYYY-MM-DD). */
export const dayKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Pure: returns a 7-day array of YYYY-MM-DD keys starting at `start`. */
export const weekDates = (start) => {
  const out = [];
  const base = new Date(start);
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(dayKey(d));
  }
  return out;
};

/** Pure fatigue hint: flags a candidate shift against the employee's existing assignments window. */
export const fatigueHints = (existingAssignments = [], candidateDate) => {
  const hints = [];
  const sameDay = existingAssignments.filter((a) => a.date === candidateDate && a.status !== 'cancelled');
  if (sameDay.length > 0) hints.push('Employee already has a shift this day');
  const nights = existingAssignments.filter((a) => a.shiftKind === 'night' && a.status !== 'cancelled');
  if (nights.length >= 4) hints.push('Employee is near the consecutive night-shift limit');
  return hints;
};
