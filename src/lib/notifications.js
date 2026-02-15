import { apiClient } from './api-client';

// Get all notifications for current user
export const getNotifications = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.append('page', filters.page);
  if (filters.limit) queryParams.append('limit', filters.limit);
  if (filters.isRead !== undefined) queryParams.append('isRead', filters.isRead);
  if (filters.type) queryParams.append('type', filters.type);
  if (filters.priority) queryParams.append('priority', filters.priority);
  const query = queryParams.toString();
  return apiClient.get(`/notifications${query ? `?${query}` : ''}`);
};

// Get notification stats
export const getNotificationStats = () => apiClient.get('/notifications/stats');

// Get single notification
export const getNotificationById = (id) => apiClient.get(`/notifications/${id}`);

// Create notification (admin only)
export const createNotification = (data) => apiClient.post('/notifications', data);

// Broadcast notification to users (admin only)
export const broadcastNotification = (data) => apiClient.post('/notifications/broadcast', data);

// Mark notification as read
export const markAsRead = (id) => apiClient.patch(`/notifications/${id}/read`);
export const acknowledgeNotification = (id) => apiClient.patch(`/notifications/${id}/acknowledge`);

// Mark all notifications as read
export const markAllAsRead = () => apiClient.patch('/notifications/read-all');

// Delete notification
export const deleteNotification = (id) => apiClient.delete(`/notifications/${id}`);

// Clear all read notifications
export const clearReadNotifications = () => apiClient.delete('/notifications/clear-read');
