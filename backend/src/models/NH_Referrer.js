const mongoose = require('mongoose');

const REFERRAL_MODULES = ['opd', 'ipd', 'appointment', 'lab', 'radiology', 'pharmacy', 'ot', 'general'];

const commissionRateSchema = new mongoose.Schema({
  module: { type: String, enum: REFERRAL_MODULES, required: true },
  percentage: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const referrerSchema = new mongoose.Schema({
  referrerCode: { type: String, index: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['doctor', 'staff', 'agent', 'hospital', 'clinic', 'individual', 'other'],
    default: 'individual'
  },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  address: { type: String, trim: true },
  organization: { type: String, trim: true },
  qualification: { type: String, trim: true },
  registrationNumber: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  bankDetails: {
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    bankName: { type: String, trim: true },
    upiId: { type: String, trim: true }
  },
  // Per-module commission percentages. Falls back to defaultPercentage.
  commissionRates: { type: [commissionRateSchema], default: [] },
  defaultPercentage: { type: Number, default: 0, min: 0, max: 100 },
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

referrerSchema.index({ name: 1 });

module.exports = mongoose.model('Referrer', referrerSchema);
module.exports.REFERRAL_MODULES = REFERRAL_MODULES;
