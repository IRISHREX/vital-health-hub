import { apiClient } from './api-client';

export const checkHealth = async () => {
  try {
    const data = await apiClient.get('/health');
    return data;
  } catch (error) {
    // Health check is best-effort. Don't pollute the console with errors when
    // the backend is intentionally unreachable (e.g. hosted preview without
    // an attached API). Surface a soft warning instead.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('Health check unavailable:', error?.message || error);
    }
    return { ok: false, error: error?.message || String(error) };
  }
};
