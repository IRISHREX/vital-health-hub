import { apiClient } from "./api-client";

export const getRoomTypeServices = async () => {
  const response = await apiClient.get('/room-type-services');
  return response;
};

export const getRoomTypeServiceByType = async (roomType) => {
  const response = await apiClient.get(`/room-type-services/${roomType}`);
  return response;
};

export const upsertRoomTypeService = async (payload) => {
  const response = await apiClient.post('/room-type-services', payload);
  return response;
};

export const updateServiceRule = async (roomType, payload) => {
  const response = await apiClient.patch(`/room-type-services/${roomType}/rules`, payload);
  return response;
};

export const removeServiceRule = async (roomType, ruleId) => {
  const response = await apiClient.delete(`/room-type-services/${roomType}/rules/${ruleId}`);
  return response;
};

export const checkServiceBillable = async (roomType, serviceId) => {
  const response = await apiClient.get(`/room-type-services/${roomType}/check/${serviceId}`);
  return response;
};
