const mongoose = require('mongoose');
const crypto = require('crypto');

const salarySchema = new mongoose.Schema({
  // Pay structure. `mode` decides how the payroll engine prorates the month.
  mode: { type: String, enum: ['monthly', 'daily', 'hourly'], default: 'monthly' },
  basic: { type: Number, default: 0, min: 0 },
  hra: { type: Number, default: 0, min: 0 },
  allowances: { type: Number, default: 0, min: 0 },
  dailyRate: { type: Number, default: 0, min: 0 },
  hourlyRate: { type: Number, default: 0, min: 0 },
  pfPercent: { type: Number, default: 0, min: 0, max: 100 },
  esiPercent: { type: Number, default: 0, min: 0, max: 100 },
  professionalTax: { type: Number, default: 0, min: 0 },
  otherDeductions: { type: Number, default: 0, min: 0 },
}, { _id: false });

const leaveBalanceSchema = new mongoose.Schema({
  casual: { type: Number, default: 12, min: 0 },
  sick: { type: Number, default: 6, min: 0 },
  earned: { type: Number, default: 0, min: 0 },
  unpaidTaken: { type: Number, default: 0, min: 0 },
}, { _id: false });


const licenseSchema = new mongoose.Schema({
  type: { type: String, enum: ['medical_council', 'dea', 'nursing_council', 'pharmacy', 'radiology', 'other'], default: 'other' },
  number: { type: String, trim: true },
  issuingAuthority: { type: String, trim: true },
  issuedOn: { type: Date },
  expiresOn: { type: Date },
  documentUrl: { type: String, trim: true },
  verified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
}, { timestamps: true });

const certificationSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  provider: { type: String, trim: true },
  certifiedOn: { type: Date },
  expiresOn: { type: Date },
  documentUrl: { type: String, trim: true },
}, { timestamps: true });

const immunizationSchema = new mongoose.Schema({
  vaccine: { type: String, enum: ['hep_b', 'influenza', 'covid19', 'tetanus', 'mmr', 'other'], default: 'other' },
  doseLabel: { type: String, trim: true },
  administeredOn: { type: Date },
  nextDueOn: { type: Date },
  batchNumber: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

const healthCheckSchema = new mongoose.Schema({
  checkType: { type: String, enum: ['annual', 'pre_employment', 'post_exposure', 'fitness'], default: 'annual' },
  performedOn: { type: Date },
  nextDueOn: { type: Date },
  findings: { type: String, trim: true },
  fitForDuty: { type: Boolean, default: true },
  documentUrl: { type: String, trim: true },
}, { timestamps: true });

const hazardExposureSchema = new mongoose.Schema({
  exposureType: { type: String, enum: ['needle_stick', 'radiation', 'chemical', 'biohazard', 'other'], default: 'other' },
  occurredOn: { type: Date },
  description: { type: String, trim: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  followUpDone: { type: Boolean, default: false },
  followUpNotes: { type: String, trim: true },
}, { timestamps: true });

const privilegeSchema = new mongoose.Schema({
  procedure: { type: String, trim: true },
  specialty: { type: String, trim: true },
  level: { type: String, enum: ['assist', 'independent', 'supervisor'], default: 'assist' },
  grantedOn: { type: Date },
  expiresOn: { type: Date },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'suspended', 'revoked'], default: 'active' },
}, { timestamps: true });

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, trim: true },
  // Optional login account. Employees without a login can still be paid and
  // marked present through their ID card.
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true, default: '' },
  photoUrl: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String, trim: true },

  designation: { type: String, trim: true },
  department: { type: String, trim: true },
  // Cost/revenue attribution bucket, mirrors the app module keys.
  module: {
    type: String,
    enum: ['general', 'opd', 'ipd', 'lab', 'radiology', 'pharmacy', 'ot', 'nursing', 'administration', 'housekeeping', 'billing'],
    default: 'general',
  },
  employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern', 'visiting'], default: 'full_time' },
  joiningDate: { type: Date },
  exitDate: { type: Date },

  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  address: { type: String, trim: true },
  emergencyContactName: { type: String, trim: true },
  emergencyContactPhone: { type: String, trim: true },

  qualification: { type: String, trim: true },
  registrationNumber: { type: String, trim: true },

  bankName: { type: String, trim: true },
  bankAccountNumber: { type: String, trim: true },
  bankIfsc: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  uanNumber: { type: String, trim: true },

  salary: { type: salarySchema, default: () => ({}) },
  leaveBalance: { type: leaveBalanceSchema, default: () => ({}) },

  // Secret embedded in the printed ID card QR. Rotatable if a card is lost.
  cardToken: { type: String, required: true, unique: true },
  cardIssuedAt: { type: Date },


  // ---- Core Employee Management (HRMS) ----
  staffCategory: {
    type: String,
    enum: ['doctor', 'nurse', 'paramedic', 'administrative', 'lab_tech', 'radiology_tech', 'pharmacy_staff', 'housekeeping', 'locum_contract', 'other'],
    default: 'other',
  },
  licenses: { type: [licenseSchema], default: [] },
  certifications: { type: [certificationSchema], default: [] },
  immunizations: { type: [immunizationSchema], default: [] },
  healthChecks: { type: [healthCheckSchema], default: [] },
  hazardExposures: { type: [hazardExposureSchema], default: [] },
  privileges: { type: [privilegeSchema], default: [] },

  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

employeeSchema.index({ employeeCode: 1 }, { unique: true });
employeeSchema.index({ firstName: 1, lastName: 1 });

employeeSchema.statics.generateCardToken = () => crypto.randomBytes(16).toString('hex');

employeeSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
