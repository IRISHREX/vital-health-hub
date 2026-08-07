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
