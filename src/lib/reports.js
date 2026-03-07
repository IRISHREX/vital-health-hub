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

export const getPrescriptionsReport = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.mode) queryParams.append('mode', filters.mode);
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));
  const query = queryParams.toString();
  return apiClient.get(`/reports/prescriptions${query ? `?${query}` : ''}`);
};

export const getBillingReport = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.type) queryParams.append('type', filters.type);
  if (filters.billingScope) queryParams.append('billingScope', filters.billingScope);
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));
  const query = queryParams.toString();
  return apiClient.get(`/reports/billing${query ? `?${query}` : ''}`);
};

export const getAnalyzerReport = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.dimension) queryParams.append('dimension', filters.dimension);
  if (filters.limit) queryParams.append('limit', String(filters.limit));
  const query = queryParams.toString();
  return apiClient.get(`/reports/analyzer${query ? `?${query}` : ''}`);
};
