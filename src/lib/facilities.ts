import { apiClient } from "./api-client";

export const getFacilities = async () => {
  const response = await apiClient.get('/facilities');
  return response.data || [];
};
export const getFacilityById = async (id: string) => {
    const response = await apiClient.get(`/facilities/${id}`);
    return response.data;
};

export const createFacility = async (facilityData: any) => {
    const response = await apiClient.post('/facilities', facilityData);
    return response.data;
};

export const updateFacility = async (id: string, facilityData: any) => {
    const response = await apiClient.put(`/facilities/${id}`, facilityData);
    return response.data;
};

export const deleteFacility = async (id: string) => {
    const response = await apiClient.delete(`/facilities/${id}`);
    return response.data;
};

export const addFacilityService = async (facilityId: string, serviceData: any) => {
    const response = await apiClient.post(`/facilities/${facilityId}/services`, serviceData);
    return response.data;
};

export const updateFacilityService = async (facilityId: string, serviceId: string, serviceData: any) => {
    const response = await apiClient.put(`/facilities/${facilityId}/services/${serviceId}`, serviceData);
    return response.data;
};

export const deleteFacilityService = async (facilityId: string, serviceId: string) => {
    const response = await apiClient.delete(`/facilities/${facilityId}/services/${serviceId}`);
    return response.data;
};
