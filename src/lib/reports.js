import { apiClient } from "./api-client";

export const getKpis = async () => {
  return apiClient.get('/reports/kpis');
};

export const getFinancialReport = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.groupBy) queryParams.append('groupBy', filters.groupBy);
  const query = queryParams.toString();
  return apiClient.get(`/reports/financial${query ? `?${query}` : ''}`);
};

export const getAdmissionsReport = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  const query = queryParams.toString();
  return apiClient.get(`/reports/admissions${query ? `?${query}` : ''}`);
};
