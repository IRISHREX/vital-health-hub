const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  code: { type: String, trim: true, required: true },
  label: { type: String, trim: true, required: true },
  amount: { type: Number, default: 0 },
}, { _id: false });

const payslipSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeCode: { type: String, trim: true },
  employeeName: { type: String, trim: true },
  staffCategory: { type: String, trim: true },
  designation: { type: String, trim: true },
  payModel: { type: String, trim: true, default: 'fixed_monthly' },

  monthDays: { type: Number, default: 30 },
  presentDays: { type: Number, default: 0 },
  paidLeaveDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  payableDays: { type: Number, default: 0 },

  regularHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  nightHours: { type: Number, default: 0 },
  onCallHours: { type: Number, default: 0 },
  standbyHours: { type: Number, default: 0 },
  calloutCount: { type: Number, default: 0 },
  proceduresCount: { type: Number, default: 0 },

  earnings: { type: [lineItemSchema], default: [] },
  deductions: { type: [lineItemSchema], default: [] },

  grossEarnings: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netPay: { type: Number, default: 0 },

  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paymentMode: { type: String, enum: ['bank_transfer', 'cash', 'cheque', 'upi'], default: 'bank_transfer' },
  paymentReference: { type: String, trim: true },
  payslipNumber: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: true, timestamps: true });

const STATUSES = ['draft', 'review', 'finalized', 'paid', 'cancelled'];

const hrmsPayrollRunSchema = new mongoose.Schema({
  runNumber: { type: String, trim: true, index: true },
  period: { type: String, required: true }, // YYYY-MM
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  status: { type: String, enum: STATUSES, default: 'draft' },
  items: { type: [payslipSchema], default: [] },
  totals: {
    grossEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    headcount: { type: Number, default: 0 },
  },
  expensePosted: { type: Boolean, default: false },
  expenseRef: { type: mongoose.Schema.Types.ObjectId },
  finalizedAt: { type: Date },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

hrmsPayrollRunSchema.index({ period: 1 }, { unique: true });
hrmsPayrollRunSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.models.HrmsPayrollRun || mongoose.model('HrmsPayrollRun', hrmsPayrollRunSchema);
