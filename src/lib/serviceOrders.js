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

export const getServiceOrders = async (params) => {
  const response = await apiClient.get(`/service-orders${toQuery(params)}`);
  return response;
};

export const createServiceOrder = async (payload) => {
  const response = await apiClient.post('/service-orders', payload);
  return response;
};

export const updateServiceOrder = async (id, payload) => {
  const response = await apiClient.patch(`/service-orders/${id}`, payload);
  return response;
};
