const mongoose = require('mongoose');

const PAY_MODELS = ['fixed_monthly', 'hourly', 'per_procedure', 'per_diem_locum', 'retainer'];
const TAX_REGIMES = ['slab', 'flat'];

const procedureRateSchema = new mongoose.Schema({
  procedure: { type: String, trim: true, required: true },
  amount: { type: Number, default: 0, min: 0 },
}, { _id: false });

const statutorySchema = new mongoose.Schema({
  pfPercent: { type: Number, default: 12, min: 0 },
  esiPercent: { type: Number, default: 0, min: 0 },
  professionalTax: { type: Number, default: 0, min: 0 },
  incomeTaxRegime: { type: String, enum: TAX_REGIMES, default: 'slab' },
  flatTaxPercent: { type: Number, default: 0, min: 0 },
  socialSecurityPercent: { type: Number, default: 0, min: 0 },
}, { _id: false });

const monthlyCTCSchema = new mongoose.Schema({
  basic: { type: Number, default: 0, min: 0 },
  hra: { type: Number, default: 0, min: 0 },
  allowances: { type: Number, default: 0, min: 0 },
  specialAllowance: { type: Number, default: 0, min: 0 },
}, { _id: false });

const employeePayProfileSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true, index: true },
  payModel: { type: String, enum: PAY_MODELS, default: 'fixed_monthly' },
  monthlyCTC: { type: monthlyCTCSchema, default: () => ({}) },
  hourlyRate: { type: Number, default: 0, min: 0 },
  perProcedureRates: { type: [procedureRateSchema], default: [] },
  perDiemRate: { type: Number, default: 0, min: 0 },
  retainerAmount: { type: Number, default: 0, min: 0 },
  overtimeMultiplier: { type: Number, default: 1.5, min: 1 },
  nightDifferentialPercent: { type: Number, default: 0, min: 0 },
  hazardPayPerShift: { type: Number, default: 0, min: 0 },
  onCallRatePerHour: { type: Number, default: 0, min: 0 },
  standbyRatePerHour: { type: Number, default: 0, min: 0 },
  calloutFlatAmount: { type: Number, default: 0, min: 0 },
  statutory: { type: statutorySchema, default: () => ({}) },
  bankDetailsOnFile: { type: Boolean, default: false },
  effectiveFrom: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

employeePayProfileSchema.statics.PAY_MODELS = PAY_MODELS;
employeePayProfileSchema.statics.TAX_REGIMES = TAX_REGIMES;

module.exports = mongoose.models.EmployeePayProfile || mongoose.model('EmployeePayProfile', employeePayProfileSchema);
