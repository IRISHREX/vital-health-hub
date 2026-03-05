import { apiClient } from './api-client';

export const getTasks = async (params = {}) => {
  const query = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
  return await apiClient.get(`/tasks${query}`);
};

export const getMyTasks = async () => {
  return await apiClient.get('/tasks/my');
};

export const getTask = async (id) => apiClient.get(`/tasks/${id}`);
export const createTask = async (data) => apiClient.post('/tasks', data);
export const updateTask = async (id, data) => apiClient.put(`/tasks/${id}`, data);
export const completeTask = async (id, notes) => apiClient.put(`/tasks/${id}/complete`, { notes });
export const deleteTask = async (id) => apiClient.delete(`/tasks/${id}`);

export default { getTasks, getMyTasks, getTask, createTask, updateTask, completeTask, deleteTask };