import { apiClient } from './api-client';

/**
 * Admission API functions for bed allocation and service utilization tracking
 */

// @desc Create new patient admission
// @param data { patientId, bedId, admittingDoctorId, admissionType, diagnosis, symptoms, treatmentPlan, expectedDischargeDate, notes }
// @returns Promise with admission and invoice data
export const createAdmission = async (data) => {
  try {
    const response = await apiClient.post('/admissions', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create admission' };
  }
};

// @desc Get all admissions
// @param filters { patientId, status, bedId, page, limit }
// @returns Promise with admissions list and pagination
export const getAdmissions = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admissions', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch admissions' };
  }
};

// @desc Get single admission details
// @param admissionId
// @returns Promise with admission object and associated invoice
export const getAdmission = async (admissionId) => {
  try {
    const response = await apiClient.get(`/admissions/${admissionId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch admission' };
  }
};

// @desc Get admission statistics
// @returns Promise with stats (total, admitted, discharged, etc.)
export const getAdmissionStats = async () => {
  try {
    const response = await apiClient.get('/admissions/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch admission stats' };
  }
};

// @desc Transfer patient to different bed/ward
// @param admissionId
// @param data { newBedId, transferReason }
// @returns Promise with updated admission and charge information
export const transferPatient = async (admissionId, data) => {
  try {
    const response = await apiClient.post(`/admissions/${admissionId}/transfer`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to transfer patient' };
  }
};

// @desc Discharge patient from admission
// @param admissionId
// @param data { dischargingDoctorId, dischargeReason, notes }
// @returns Promise with discharged admission and final invoice
export const dischargePatient = async (admissionId, data) => {
  try {
    const response = await apiClient.post(`/admissions/${admissionId}/discharge`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to discharge patient' };
  }
};

/**
 * Utility functions for frontend
 */

// Calculate length of stay in days
export const calculateLengthOfStay = (admissionDate: string | Date, dischargeDate: string | Date): number => {
  const start = new Date(admissionDate).getTime();
  const end = new Date(dischargeDate).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};

// Calculate bed charges for a specific allocation
export const calculateBedCharges = (allocatedFrom: string | Date, allocatedTo: string | Date, pricePerDay: number) => {
  const start = new Date(allocatedFrom).getTime();
  const end = new Date(allocatedTo).getTime();
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return {
    days,
    amount: days * pricePerDay
  };
};

// Get status badge color
export const getStatusColor = (status) => {
  const colors = {
    'ADMITTED': 'bg-blue-100 text-blue-900',
    'TRANSFERRED': 'bg-purple-100 text-purple-900',
    'DISCHARGED': 'bg-green-100 text-green-900',
    'DECEASED': 'bg-red-100 text-red-900'
  };
  return colors[status] || 'bg-gray-100 text-gray-900';
};

// Format admission data for display
export const formatAdmissionData = (admission) => {
  return {
    ...admission,
    displayStatus: admission.status,
    statusColor: getStatusColor(admission.status),
    lengthOfStay: admission.actualDischargeDate 
      ? calculateLengthOfStay(admission.admissionDate, admission.actualDischargeDate)
      : calculateLengthOfStay(admission.admissionDate, new Date()),
    totalBedCharges: admission.bedAllocations?.reduce((sum: number, bed: any) => {
      const start = new Date(bed.allocatedFrom).getTime();
      const end = new Date(bed.allocatedTo).getTime();
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return sum + (days * bed.pricePerDay);
    }, 0) || 0
  };
};

// Get available beds for transfer
export const getAvailableBeds = async (filters = {}) => {
  try {
    const response = await apiClient.get('/beds', { 
      params: { 
        status: 'available',
        ...filters 
      } 
    });
    return response.data.data?.beds || [];
  } catch (error) {
    console.error('Failed to fetch available beds:', error);
    return [];
  }
};

// Get patient's current admission
export const getPatientCurrentAdmission = async (patientId) => {
  try {
    const response = await apiClient.get('/admissions', {
      params: {
        patientId,
        status: 'ADMITTED'
      }
    });
    return response.data.data?.admissions?.[0] || null;
  } catch (error) {
    console.error('Failed to fetch patient admission:', error);
    return null;
  }
};

// Get admission bed history for visualization
export const getAdmissionBedHistory = (admission) => {
  return {
    allocations: admission.bedAllocations || [],
    transfers: admission.transferHistory || [],
    timeline: buildTimeline(admission)
  };
};

// Build timeline of events
const buildTimeline = (admission: any) => {
  const events: any[] = [
    {
      type: 'admission',
      date: admission.admissionDate,
      description: `Admitted to bed ${admission.bed?.bedNumber || 'N/A'}`,
      bed: admission.bed
    }
  ];

  // Add transfers
  if (admission.transferHistory?.length > 0) {
    admission.transferHistory.forEach((transfer: any, index: number) => {
      events.push({
        type: 'transfer',
        date: transfer.transferDate,
        description: `Transferred from ${transfer.fromWard} to ${transfer.toWard}`,
        transferReason: transfer.transferReason,
        fromBed: transfer.fromBed,
        toBed: transfer.toBed
      });
    });
  }

  // Add discharge
  if (admission.actualDischargeDate) {
    events.push({
      type: 'discharge',
      date: admission.actualDischargeDate,
      description: 'Patient discharged',
      dischargeNotes: admission.dischargeNotes
    });
  }

  return events.sort((a: any, b: any) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeA - timeB;
  });
};

// Generate invoice summary for display
export const generateInvoiceSummary = (admission, invoice) => {
  if (!invoice) return null;

  const bedCharges = invoice.items?.filter(item => item.category === 'bed_charges') || [];
  
  return {
    invoiceNumber: invoice.invoiceNumber,
    admissionId: admission.admissionId,
    patientName: `${admission.patient?.firstName} ${admission.patient?.lastName}`,
    admissionDate: admission.admissionDate,
    dischargeDate: admission.actualDischargeDate,
    lengthOfStay: calculateLengthOfStay(admission.admissionDate, admission.actualDischargeDate || new Date()),
    bedCharges: bedCharges.map(item => ({
      description: item.description,
      days: item.quantity,
      ratePerDay: item.unitPrice,
      amount: item.amount
    })),
    otherCharges: invoice.items?.filter(item => item.category !== 'bed_charges') || [],
    subtotal: invoice.subtotal,
    discount: invoice.discountAmount,
    tax: invoice.totalTax,
    total: invoice.totalAmount,
    paid: invoice.paidAmount,
    due: invoice.dueAmount,
    status: invoice.status
  };
};

// Export type definitions as comments for reference
/**
 * @typedef {Object} Admission
 * @property {string} admissionId - Unique admission ID
 * @property {string} patient - Patient ObjectId
 * @property {string} bed - Current bed ObjectId
 * @property {string} admittingDoctor - Doctor ObjectId
 * @property {string[]} attendingDoctors - Array of doctor ObjectIds
 * @property {Date} admissionDate - Admission date
 * @property {Date} expectedDischargeDate - Expected discharge date
 * @property {Date} actualDischargeDate - Actual discharge date
 * @property {string} status - ADMITTED | TRANSFERRED | DISCHARGED | DECEASED
 * @property {Object} diagnosis - Diagnosis object
 * @property {string[]} symptoms - Symptoms array
 * @property {string} treatmentPlan - Treatment plan text
 * @property {Array} bedAllocations - Bed utilization history
 * @property {Array} transferHistory - Transfer history
 * @property {number} totalDays - Total length of stay
 */

/**
 * @typedef {Object} BedAllocation
 * @property {string} bed - Bed ObjectId
 * @property {Date} allocatedFrom - Start of allocation
 * @property {Date} allocatedTo - End of allocation
 * @property {number} pricePerDay - Daily bed charge
 * @property {string} status - ALLOCATED | RELEASED
 */

/**
 * @typedef {Object} Invoice
 * @property {string} invoiceNumber - Invoice number
 * @property {string} patient - Patient ObjectId
 * @property {string} admission - Admission ObjectId
 * @property {string} type - opd | ipd | pharmacy | lab | other
 * @property {Array} items - Invoice line items
 * @property {number} subtotal - Subtotal amount
 * @property {number} discountAmount - Discount amount
 * @property {number} totalTax - Total tax
 * @property {number} totalAmount - Total amount
 * @property {number} paidAmount - Paid amount
 * @property {number} dueAmount - Due amount
 * @property {string} status - draft | pending | partial | paid | overdue | cancelled | refunded
 */
