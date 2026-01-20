import { apiClient } from './api-client';

export const checkHealth = async () => {
  try {
    const data = await apiClient.get('/health');
    return data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};
