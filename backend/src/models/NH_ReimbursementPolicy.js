const mongoose = require('mongoose');

const CLAIM_TYPES = [
  'cme', 'license_renewal', 'travel_home_visit', 'uniform_scrub_stipend',
  'conference', 'relocation', 'medical', 'other',
];

const STAFF_CATEGORIES = [
  'doctor', 'nurse', 'paramedic', 'administrative', 'lab_tech',
  'radiology_tech', 'pharmacy_staff', 'housekeeping', 'locum_contract', 'other',
];

const policySchema = new mongoose.Schema({
  claimType: { type: String, enum: CLAIM_TYPES, required: true, unique: true },
  annualCapAmount: { type: Number, default: 0, min: 0 },
  perClaimCapAmount: { type: Number, default: 0, min: 0 },
  requiresReceiptAbove: { type: Number, default: 0, min: 0 },
  eligibleStaffCategories: { type: [String], enum: STAFF_CATEGORIES, default: [] },
  approvalChain: { type: [String], enum: ['ward_incharge', 'dept_head', 'finance'], default: ['ward_incharge', 'dept_head', 'finance'] },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ReimbursementPolicy', policySchema);
module.exports.CLAIM_TYPES = CLAIM_TYPES;
module.exports.STAFF_CATEGORIES = STAFF_CATEGORIES;
