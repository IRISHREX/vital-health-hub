import { apiClient } from "./api-client";

export interface InvoiceItem {
  description: string;
  category: "bed_charges" | "doctor_fee" | "nursing" | "medication" | "procedure" | "lab_test" | "radiology" | "surgery" | "other";
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  amount: number;
}

export interface TaxDetails {
  cgst?: { rate: number; amount: number };
  sgst?: { rate: number; amount: number };
  igst?: { rate: number; amount: number };
}

export interface Payment {
  amount: number;
  method: "cash" | "card" | "upi" | "net_banking" | "cheque" | "insurance";
  reference?: string;
  paidAt: Date;
  receivedBy: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    name?: string;
    phone?: string;
  };
  admission?: string;
  appointment?: string;
  type: "opd" | "ipd" | "pharmacy" | "lab" | "other";
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxDetails?: TaxDetails;
  totalTax: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "draft" | "pending" | "partial" | "paid" | "overdue" | "cancelled" | "refunded";
  dueDate: string;
  payments?: Payment[];
  notes?: string;
  generatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateInvoiceRequest {
  patient: string;
  admission?: string;
  appointment?: string;
  type: "opd" | "ipd" | "pharmacy" | "lab" | "other";
  items: InvoiceItem[];
  subtotal: number;
  discountAmount?: number;
  discountReason?: string;
  taxDetails?: TaxDetails;
  totalTax: number;
  totalAmount: number;
  dueDate: string;
  notes?: string;
}

export interface AddPaymentRequest {
  amount: number;
  method: "cash" | "card" | "upi" | "net_banking" | "cheque" | "insurance";
  reference?: string;
}

export const getInvoices = async (
  filters: {
    patientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}
) => {
  const queryParams = new URLSearchParams();
  if (filters.patientId) queryParams.append("patientId", filters.patientId);
  if (filters.status) queryParams.append("status", filters.status);
  if (filters.startDate) queryParams.append("startDate", filters.startDate);
  if (filters.endDate) queryParams.append("endDate", filters.endDate);
  const query = queryParams.toString();
  return apiClient.get(`/invoices${query ? `?${query}` : ""}`);
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response = await apiClient.get(`/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (
  invoiceData: CreateInvoiceRequest
): Promise<Invoice> => {
  const response = await apiClient.post("/invoices", invoiceData);
  return response.data;
};

export const updateInvoice = async (
  id: string,
  invoiceData: Partial<CreateInvoiceRequest>
): Promise<Invoice> => {
  const response = await apiClient.put(`/invoices/${id}`, invoiceData);
  return response.data;
};

export const deleteInvoice = async (id: string): Promise<any> => {
  const response = await apiClient.delete(`/invoices/${id}`);
  return response.data;
};

export const addPayment = async (
  invoiceId: string,
  paymentData: AddPaymentRequest
): Promise<Invoice> => {
  const response = await apiClient.post(`/invoices/${invoiceId}/payments`, paymentData);
  return response.data;
};
