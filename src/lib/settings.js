import { apiClient } from './api-client';

// Get all settings at once
export const getAllSettings = () => apiClient.get('/settings');

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
