import { apiClient } from './api-client';

/** Active platform announcements/alerts visible to the current hospital. */
export const getPlatformNotices = () => apiClient.get('/platform-notices');
