import { apiClient } from './api-client';

const qs = (p) => {
  const s = new URLSearchParams();
  Object.entries(p || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v);
  });
  const q = s.toString();
  return q ? `?${q}` : '';
};

export const scanAttendance = (data) => apiClient.post('/attendance/scan', data);
// Kiosk: an operator scans an employee ID card QR (payload: employeeToken, optional locationToken).
export const scanEmployeeCard = (data) => apiClient.post('/attendance/card-scan', data);
export const getMyAttendance = () => apiClient.get('/attendance/me');
export const listAttendance = (params) => apiClient.get(`/attendance${qs(params)}`);
export const upsertManualAttendance = (data) => apiClient.post('/attendance', data);

export const listAttendanceLocations = () => apiClient.get('/attendance/locations');
export const createAttendanceLocation = (data) => apiClient.post('/attendance/locations', data);
export const updateAttendanceLocation = (id, data) => apiClient.put(`/attendance/locations/${id}`, data);
export const rotateAttendanceLocationToken = (id) => apiClient.post(`/attendance/locations/${id}/rotate`, {});
export const deactivateAttendanceLocation = (id) => apiClient.delete(`/attendance/locations/${id}`);

export const submitPunch = (data) => apiClient.post('/attendance/punch', data);

export const ATTENDANCE_STATUSES = ['present', 'checked_in', 'absent', 'half_day', 'leave'];

/** Pure: format stored minutes as "7h 30m". */
export const formatWorkedMinutes = (minutes) => {
  const total = Number(minutes) || 0;
  if (total <= 0) return '—';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
};
