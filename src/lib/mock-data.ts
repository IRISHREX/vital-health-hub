// Mock data for the Hospital Management Dashboard
// This will be replaced with real database queries once the schema is set up

export type BedStatus = 'available' | 'occupied' | 'cleaning' | 'reserved';
export type BedType = 'ICU' | 'CCU' | 'General' | 'Semi-Private' | 'Private' | 'Emergency' | 'Ventilator';
export type PatientType = 'OPD' | 'IPD';
export type PaymentStatus = 'paid' | 'partial' | 'pending';

export interface Bed {
  id: string;
  number: string;
  type: BedType;
  status: BedStatus;
  floor: number;
  ward: string;
  patientId?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  address: string;
  type: PatientType;
  diagnosis?: string;
  admissionDate?: string;
  bedId?: string;
  doctorId?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  phone: string;
  email: string;
  available: boolean;
  consultationFee: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: 'OPD' | 'Follow-up' | 'Emergency';
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  totalAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  createdAt: string;
  items: {
    description: string;
    amount: number;
  }[];
}

export interface Facility {
  id: string;
  name: string;
  type: 'ICU' | 'Lab' | 'OT' | 'Pharmacy' | 'Radiology' | 'Ambulance' | 'Emergency';
  available: boolean;
  description: string;
}

// Dashboard KPIs
export interface DashboardStats {
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  admittedPatients: number;
  availableDoctors: number;
  pendingBills: number;
  todayAppointments: number;
  todayDischarges: number;
}

// Mock beds data
export const mockBeds: Bed[] = [
  { id: '1', number: 'ICU-001', type: 'ICU', status: 'occupied', floor: 2, ward: 'ICU Ward' },
  { id: '2', number: 'ICU-002', type: 'ICU', status: 'available', floor: 2, ward: 'ICU Ward' },
  { id: '3', number: 'ICU-003', type: 'ICU', status: 'cleaning', floor: 2, ward: 'ICU Ward' },
  { id: '4', number: 'CCU-001', type: 'CCU', status: 'occupied', floor: 2, ward: 'Cardiac Care' },
  { id: '5', number: 'CCU-002', type: 'CCU', status: 'available', floor: 2, ward: 'Cardiac Care' },
  { id: '6', number: 'GEN-001', type: 'General', status: 'available', floor: 1, ward: 'General Ward A' },
  { id: '7', number: 'GEN-002', type: 'General', status: 'occupied', floor: 1, ward: 'General Ward A' },
  { id: '8', number: 'GEN-003', type: 'General', status: 'available', floor: 1, ward: 'General Ward A' },
  { id: '9', number: 'GEN-004', type: 'General', status: 'reserved', floor: 1, ward: 'General Ward B' },
  { id: '10', number: 'PVT-001', type: 'Private', status: 'occupied', floor: 3, ward: 'Private Wing' },
  { id: '11', number: 'PVT-002', type: 'Private', status: 'available', floor: 3, ward: 'Private Wing' },
  { id: '12', number: 'SPV-001', type: 'Semi-Private', status: 'occupied', floor: 3, ward: 'Semi-Private Wing' },
  { id: '13', number: 'EMR-001', type: 'Emergency', status: 'available', floor: 1, ward: 'Emergency' },
  { id: '14', number: 'EMR-002', type: 'Emergency', status: 'occupied', floor: 1, ward: 'Emergency' },
  { id: '15', number: 'VNT-001', type: 'Ventilator', status: 'occupied', floor: 2, ward: 'ICU Ward' },
];

// Mock patients data
export const mockPatients: Patient[] = [
  { id: '1', name: 'Rajesh Kumar', age: 45, gender: 'Male', phone: '+91 98765 43210', email: 'rajesh@email.com', address: '123 MG Road, Mumbai', type: 'IPD', diagnosis: 'Cardiac Arrhythmia', admissionDate: '2026-01-10', bedId: '1', doctorId: '1' },
  { id: '2', name: 'Priya Sharma', age: 32, gender: 'Female', phone: '+91 98765 43211', email: 'priya@email.com', address: '456 Park Street, Mumbai', type: 'IPD', diagnosis: 'Appendicitis', admissionDate: '2026-01-12', bedId: '4', doctorId: '3' },
  { id: '3', name: 'Amit Patel', age: 28, gender: 'Male', phone: '+91 98765 43212', email: 'amit@email.com', address: '789 Hill Road, Mumbai', type: 'OPD', diagnosis: 'Viral Fever' },
  { id: '4', name: 'Sunita Devi', age: 55, gender: 'Female', phone: '+91 98765 43213', email: 'sunita@email.com', address: '321 Lake View, Mumbai', type: 'IPD', diagnosis: 'Pneumonia', admissionDate: '2026-01-08', bedId: '7', doctorId: '2' },
  { id: '5', name: 'Vikram Singh', age: 60, gender: 'Male', phone: '+91 98765 43214', email: 'vikram@email.com', address: '654 Beach Road, Mumbai', type: 'IPD', diagnosis: 'Hip Replacement', admissionDate: '2026-01-14', bedId: '10', doctorId: '4' },
  { id: '6', name: 'Meera Nair', age: 38, gender: 'Female', phone: '+91 98765 43215', email: 'meera@email.com', address: '987 Garden Lane, Mumbai', type: 'OPD', diagnosis: 'Migraine' },
];

// Mock doctors data
export const mockDoctors: Doctor[] = [
  { id: '1', name: 'Dr. Anil Kapoor', specialization: 'Cardiology', department: 'Cardiac Care', phone: '+91 98765 11111', email: 'anil.kapoor@hospital.com', available: true, consultationFee: 1500 },
  { id: '2', name: 'Dr. Sneha Reddy', specialization: 'Pulmonology', department: 'Respiratory', phone: '+91 98765 22222', email: 'sneha.reddy@hospital.com', available: true, consultationFee: 1200 },
  { id: '3', name: 'Dr. Rahul Mehta', specialization: 'General Surgery', department: 'Surgery', phone: '+91 98765 33333', email: 'rahul.mehta@hospital.com', available: false, consultationFee: 1800 },
  { id: '4', name: 'Dr. Kavita Joshi', specialization: 'Orthopedics', department: 'Orthopedics', phone: '+91 98765 44444', email: 'kavita.joshi@hospital.com', available: true, consultationFee: 1600 },
  { id: '5', name: 'Dr. Suresh Iyer', specialization: 'Neurology', department: 'Neurology', phone: '+91 98765 55555', email: 'suresh.iyer@hospital.com', available: true, consultationFee: 2000 },
  { id: '6', name: 'Dr. Pooja Desai', specialization: 'Pediatrics', department: 'Pediatrics', phone: '+91 98765 66666', email: 'pooja.desai@hospital.com', available: false, consultationFee: 1000 },
];

// Mock invoices data
export const mockInvoices: Invoice[] = [
  { id: 'INV-2026-001', patientId: '1', patientName: 'Rajesh Kumar', totalAmount: 125000, paidAmount: 125000, status: 'paid', createdAt: '2026-01-15', items: [{ description: 'ICU Bed (5 days)', amount: 75000 }, { description: 'Consultation', amount: 1500 }, { description: 'Medications', amount: 15000 }, { description: 'Lab Tests', amount: 8500 }, { description: 'Procedures', amount: 25000 }] },
  { id: 'INV-2026-002', patientId: '2', patientName: 'Priya Sharma', totalAmount: 45000, paidAmount: 20000, status: 'partial', createdAt: '2026-01-14', items: [{ description: 'CCU Bed (2 days)', amount: 30000 }, { description: 'Surgery', amount: 10000 }, { description: 'Medications', amount: 5000 }] },
  { id: 'INV-2026-003', patientId: '4', patientName: 'Sunita Devi', totalAmount: 68000, paidAmount: 0, status: 'pending', createdAt: '2026-01-13', items: [{ description: 'General Bed (7 days)', amount: 35000 }, { description: 'Consultation', amount: 3000 }, { description: 'Medications', amount: 20000 }, { description: 'Lab Tests', amount: 10000 }] },
  { id: 'INV-2026-004', patientId: '5', patientName: 'Vikram Singh', totalAmount: 250000, paidAmount: 100000, status: 'partial', createdAt: '2026-01-14', items: [{ description: 'Private Room (1 day)', amount: 15000 }, { description: 'Hip Surgery', amount: 200000 }, { description: 'Medications', amount: 20000 }, { description: 'Physiotherapy', amount: 15000 }] },
];

// Mock facilities data
export const mockFacilities: Facility[] = [
  { id: '1', name: 'Intensive Care Unit', type: 'ICU', available: true, description: '24/7 critical care with advanced monitoring' },
  { id: '2', name: 'Pathology Lab', type: 'Lab', available: true, description: 'Complete blood work and diagnostic tests' },
  { id: '3', name: 'Operation Theatre 1', type: 'OT', available: false, description: 'Major surgery suite with latest equipment' },
  { id: '4', name: 'Operation Theatre 2', type: 'OT', available: true, description: 'Minor procedures and day surgery' },
  { id: '5', name: '24hr Pharmacy', type: 'Pharmacy', available: true, description: 'Full stock of medications and supplies' },
  { id: '6', name: 'Radiology & Imaging', type: 'Radiology', available: true, description: 'X-Ray, CT Scan, MRI, Ultrasound' },
  { id: '7', name: 'Ambulance Service', type: 'Ambulance', available: true, description: 'Fleet of 5 ambulances with paramedics' },
  { id: '8', name: 'Emergency Ward', type: 'Emergency', available: true, description: '24/7 emergency care and trauma center' },
];

// Mock appointments
export const mockAppointments: Appointment[] = [
  { id: '1', patientId: '3', doctorId: '1', date: '2026-01-15', time: '10:00', type: 'OPD', status: 'scheduled' },
  { id: '2', patientId: '6', doctorId: '5', date: '2026-01-15', time: '11:30', type: 'OPD', status: 'scheduled' },
  { id: '3', patientId: '1', doctorId: '1', date: '2026-01-16', time: '09:00', type: 'Follow-up', status: 'scheduled' },
  { id: '4', patientId: '2', doctorId: '3', date: '2026-01-15', time: '14:00', type: 'Follow-up', status: 'completed' },
];

// Dashboard stats
export const mockDashboardStats: DashboardStats = {
  totalBeds: mockBeds.length,
  availableBeds: mockBeds.filter(b => b.status === 'available').length,
  occupiedBeds: mockBeds.filter(b => b.status === 'occupied').length,
  admittedPatients: mockPatients.filter(p => p.type === 'IPD').length,
  availableDoctors: mockDoctors.filter(d => d.available).length,
  pendingBills: mockInvoices.filter(i => i.status !== 'paid').length,
  todayAppointments: mockAppointments.filter(a => a.date === '2026-01-15').length,
  todayDischarges: 2,
};

// Bed occupancy by type
export const bedOccupancyByType = [
  { type: 'ICU', total: 3, occupied: 1, available: 1, other: 1 },
  { type: 'CCU', total: 2, occupied: 1, available: 1, other: 0 },
  { type: 'General', total: 4, occupied: 1, available: 2, other: 1 },
  { type: 'Private', total: 2, occupied: 1, available: 1, other: 0 },
  { type: 'Semi-Private', total: 1, occupied: 1, available: 0, other: 0 },
  { type: 'Emergency', total: 2, occupied: 1, available: 1, other: 0 },
  { type: 'Ventilator', total: 1, occupied: 1, available: 0, other: 0 },
];

// Weekly admission data for charts
export const weeklyAdmissions = [
  { day: 'Mon', admissions: 12, discharges: 8 },
  { day: 'Tue', admissions: 15, discharges: 10 },
  { day: 'Wed', admissions: 8, discharges: 12 },
  { day: 'Thu', admissions: 18, discharges: 14 },
  { day: 'Fri', admissions: 14, discharges: 11 },
  { day: 'Sat', admissions: 10, discharges: 9 },
  { day: 'Sun', admissions: 6, discharges: 7 },
];

// Revenue data for charts
export const monthlyRevenue = [
  { month: 'Oct', revenue: 1250000 },
  { month: 'Nov', revenue: 1450000 },
  { month: 'Dec', revenue: 1680000 },
  { month: 'Jan', revenue: 1520000 },
];
