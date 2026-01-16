import { apiClient } from "./api-client";

export const getKpis = async () => {
  const response = await apiClient.get('/reports/kpis');
  return response.data || {};
};
export const getFinancialReport = async (filters: { startDate?: string, endDate?: string, groupBy?: string } = {}) => {
    const response = await apiClient.get('/reports/financial', { params: filters });
    return response.data || [];
};

export const getAdmissionsReport = async (filters: { startDate?: string, endDate?: string } = {}) => {
    const response = await apiClient.get('/reports/admissions', { params: filters });
    return response.data || [];
};
