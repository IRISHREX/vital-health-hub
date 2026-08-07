const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeCode: { type: String, trim: true },
  employeeName: { type: String, trim: true },
  designation: { type: String, trim: true },
  module: { type: String, trim: true },

  monthDays: { type: Number, default: 30 },
  presentDays: { type: Number, default: 0 },
  paidLeaveDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  payableDays: { type: Number, default: 0 },
  workedHours: { type: Number, default: 0 },

  grossFull: { type: Number, default: 0 },
  earnedGross: { type: Number, default: 0 },
  pf: { type: Number, default: 0 },
  esi: { type: Number, default: 0 },
  professionalTax: { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netPay: { type: Number, default: 0 },

  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paymentMode: { type: String, enum: ['bank_transfer', 'cash', 'cheque', 'upi'], default: 'bank_transfer' },
  paymentReference: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: true });

const payrollRunSchema = new mongoose.Schema({
  runNumber: { type: String, trim: true, index: true },
  // Period key YYYY-MM keeps one run per month.
  period: { type: String, required: true, index: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'finalized', 'paid', 'cancelled'], default: 'draft' },
  items: { type: [payslipSchema], default: [] },
  totalGross: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  totalNet: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  finalizedAt: { type: Date },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

payrollRunSchema.index({ period: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
