import { apiClient } from "./api-client";

export const getFacilities = async () => {
  const response = await apiClient.get('/facilities');
  return response || [];
};

export const getFacilityById = async (id) => {
    const response = await apiClient.get(`/facilities/${id}`);
    return response;
};

export const createFacility = async (facilityData) => {
    const response = await apiClient.post('/facilities', facilityData);
    return response;
};

export const updateFacility = async (id, facilityData) => {
    const response = await apiClient.put(`/facilities/${id}`, facilityData);
    return response;
};

export const deleteFacility = async (id) => {
    const response = await apiClient.delete(`/facilities/${id}`);
    return response;
};

export const addFacilityService = async (facilityId, serviceData) => {
    const response = await apiClient.post(`/facilities/${facilityId}/services`, serviceData);
    return response;
};

export const updateFacilityService = async (facilityId, serviceId, serviceData) => {
    const response = await apiClient.put(`/facilities/${facilityId}/services/${serviceId}`, serviceData);
    return response;
};

export const deleteFacilityService = async (facilityId, serviceId) => {
    const response = await apiClient.delete(`/facilities/${facilityId}/services/${serviceId}`);
    return response;
};
