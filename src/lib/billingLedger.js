import { apiClient } from "./api-client";

const toQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const getLedgerEntries = async (params) => {
  const response = await apiClient.get(`/billing/ledger${toQuery(params)}`);
  return response;
};

export const createLedgerEntry = async (payload) => {
  const response = await apiClient.post('/billing/ledger', payload);
  return response;
};

export const generateProvisionalInvoice = async (admissionId) => {
  const response = await apiClient.post('/billing/ledger/generate-invoice', { admissionId });
  return response;
};
