import { apiClient } from "./api-client";

export const getInvoices = async (filters: { patientId?: string, status?: string, startDate?: string, endDate?: string } = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.patientId) queryParams.append('patientId', filters.patientId);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  const query = queryParams.toString();
  return apiClient.get(`/invoices${query ? `?${query}` : ''}`);
};
export const getInvoiceById = async (id: string) => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
};

export const createInvoice = async (invoiceData: any) => {
    const response = await apiClient.post('/invoices', invoiceData);
    return response.data;
};

export const updateInvoice = async (id: string, invoiceData: any) => {
    const response = await apiClient.put(`/invoices/${id}`, invoiceData);
    return response.data;
};

export const deleteInvoice = async (id: string) => {
    const response = await apiClient.delete(`/invoices/${id}`);
    return response.data;
};

export const addPayment = async (invoiceId: string, paymentData: any) => {
    const response = await apiClient.post(`/invoices/${invoiceId}/payments`, paymentData);
    return response.data;
};
