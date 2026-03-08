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

export const getServiceCatalog = async (params) => {
  const response = await apiClient.get(`/service-catalog${toQuery(params)}`);
  return response;
};

export const getServiceCatalogById = async (id) => {
  const response = await apiClient.get(`/service-catalog/${id}`);
  return response;
};

export const createCatalogService = async (payload) => {
  const response = await apiClient.post('/service-catalog', payload);
  return response;
};

export const updateCatalogService = async (id, payload) => {
  const response = await apiClient.put(`/service-catalog/${id}`, payload);
  return response;
};

export const deleteCatalogService = async (id) => {
  const response = await apiClient.delete(`/service-catalog/${id}`);
  return response;
};
