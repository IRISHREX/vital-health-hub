import { apiClient } from './api-client';

// Get all settings at once
export const getAllSettings = () => apiClient.get('/settings');

// Get enabled modules (grandmaster org config)
export const getEnabledModules = () => apiClient.get('/settings/enabled-modules');

// Get allowed settings tabs (grandmaster config)
export const getAllowedSettingsTabs = () => apiClient.get('/settings/allowed-tabs');

// Get payment config (grandmaster config per module)
export const getPaymentConfig = () => apiClient.get('/settings/payment-config');

// Hospital settings
export const getHospitalSettings = () => apiClient.get('/settings/hospital');
export const updateHospitalSettings = (data) => apiClient.put('/settings/hospital', data);

// Security settings
export const getSecuritySettings = () => apiClient.get('/settings/security');
export const updateSecuritySettings = (data) => apiClient.put('/settings/security', data);

// Notification settings
export const getNotificationSettings = () => apiClient.get('/settings/notifications');
export const updateNotificationSettings = (data) => apiClient.put('/settings/notifications', data);

// User preferences
export const getUserPreferences = () => apiClient.get('/settings/preferences');
export const updateUserPreferences = (data) => apiClient.put('/settings/preferences', data);

// User stats for admin
export const getUserStats = () => apiClient.get('/settings/users/stats');

// Visual access overrides (email-based)
export const getVisualAccessSettings = () => apiClient.get('/settings/visual-access');
export const updateVisualAccessSettings = (data) => apiClient.put('/settings/visual-access', data);
export const createAccessRequest = (data) => apiClient.post('/settings/access-requests', data);
export const getPendingAccessRequests = () => apiClient.get('/settings/access-requests/pending');
export const respondToAccessRequest = (id, data) => apiClient.patch(`/settings/access-requests/${id}/respond`, data);

// Module operations (deployment + walk-in/billing controls)
export const getModuleOperationsSettings = () => apiClient.get('/settings/module-operations');
export const updateModuleOperationsSettings = (data) => apiClient.put('/settings/module-operations', data);

// Data management (super admin)
export const getDataManagementSettings = () => apiClient.get('/settings/data-management');
export const updateDataManagementSettings = (data) => apiClient.put('/settings/data-management', data);
export const getDataImportTemplate = (entity) => apiClient.get(`/settings/data-management/template?entity=${encodeURIComponent(entity)}`);
export const bulkImportData = (data) => apiClient.post('/settings/data-management/import', data);
export const exportDataByEntity = (entity) => apiClient.get(`/settings/data-management/export?entity=${encodeURIComponent(entity)}`);
export const runAutoExportNow = () => apiClient.post('/settings/data-management/run-auto-export', {});
