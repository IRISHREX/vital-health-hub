import { apiClient } from './api-client';

export const getMyPersonalPermissions = () => apiClient.get('/personal-permissions/my');
export const getUserPersonalPermissions = (id) => apiClient.get(`/personal-permissions/${id}`);
export const updateMyPersonalPermissions = (permissions) => apiClient.put('/personal-permissions/my', { permissions });
export const updateUserPersonalPermissions = (id, permissions) => apiClient.put(`/personal-permissions/${id}`, { permissions });
export const checkPersonalPermission = (ownerId, module, action) => apiClient.get(`/personal-permissions/check?ownerId=${ownerId}&module=${module}&action=${action}`);
