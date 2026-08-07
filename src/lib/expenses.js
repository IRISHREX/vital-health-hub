import { apiClient } from './api-client';

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, v);
  });
  const q = search.toString();
  return q ? `?${q}` : '';
};

export const listExpenses = (params) => apiClient.get(`/expenses${qs(params)}`);
export const createExpense = (data) => apiClient.post('/expenses', data);
export const updateExpense = (id, data) => apiClient.put(`/expenses/${id}`, data);
export const cancelExpense = (id, data) => apiClient.delete(`/expenses/${id}`, data);
export const getProfitAndLoss = (params) => apiClient.get(`/expenses/pnl${qs(params)}`);
export const getExpenseMeta = () => apiClient.get('/expenses/meta');

export const EXPENSE_MODULES = [
  'general', 'opd', 'ipd', 'lab', 'radiology', 'pharmacy', 'ot', 'nursing',
  'administration', 'housekeeping', 'billing', 'hr',
];

export const EXPENSE_CATEGORIES = [
  'salary', 'consumables', 'medicines', 'equipment', 'maintenance', 'rent',
  'utilities', 'marketing', 'insurance', 'taxes', 'outsourced_services',
  'housekeeping', 'transport', 'refund', 'commission', 'other',
];

export const PAYMENT_MODES = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'pending'];

/** Pure: gross + tax for an expense draft. */
export const expenseTotal = (draft = {}) =>
  Math.round(((Number(draft.amount) || 0) + (Number(draft.taxAmount) || 0)) * 100) / 100;

export const titleCase = (value) =>
  String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
