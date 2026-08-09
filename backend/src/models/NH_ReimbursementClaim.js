const mongoose = require('mongoose');

const CLAIM_TYPES = [
  'cme', 'license_renewal', 'travel_home_visit', 'uniform_scrub_stipend',
  'conference', 'relocation', 'medical', 'other',
];

const CLAIM_STATUSES = [
  'draft', 'submitted', 'ward_incharge_approved', 'dept_head_approved',
  'finance_approved', 'rejected', 'paid', 'cancelled',
];

const APPROVAL_STAGES = ['ward_incharge', 'dept_head', 'finance', 'done'];

const lineItemSchema = new mongoose.Schema({
  description: { type: String, trim: true, required: true },
  incurredOn: { type: Date },
  category: { type: String, trim: true, default: 'other' },
  amount: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  receiptUrl: { type: String, trim: true },
  receiptFileName: { type: String, trim: true },
  extracted: { type: Boolean, default: false },
  notes: { type: String, trim: true },
}, { _id: true, timestamps: false });

const approvalSchema = new mongoose.Schema({
  stage: { type: String, enum: APPROVAL_STAGES, required: true },
  decision: { type: String, enum: ['approved', 'rejected', 'returned'], required: true },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedByName: { type: String, trim: true },
  decidedAt: { type: Date, default: Date.now },
  note: { type: String, trim: true },
  approvedAmount: { type: Number },
}, { _id: false });

const auditSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  action: { type: String, trim: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName: { type: String, trim: true },
  fromStatus: { type: String, trim: true },
  toStatus: { type: String, trim: true },
  note: { type: String, trim: true },
}, { _id: false });

const claimSchema = new mongoose.Schema({
  claimNumber: { type: String, trim: true, index: true, unique: true, sparse: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  employeeCode: { type: String, trim: true },
  employeeName: { type: String, trim: true },
  staffCategory: { type: String, trim: true },
  department: { type: String, trim: true },
  module: { type: String, trim: true, default: 'general' },

  claimType: { type: String, enum: CLAIM_TYPES, default: 'other' },
  title: { type: String, trim: true, required: true },
  description: { type: String, trim: true },
  currency: { type: String, trim: true, default: 'INR' },

  lineItems: { type: [lineItemSchema], default: [] },

  claimedAmount: { type: Number, default: 0, min: 0 },
  approvedAmount: { type: Number },

  status: { type: String, enum: CLAIM_STATUSES, default: 'draft', index: true },
  currentStage: { type: String, enum: APPROVAL_STAGES, default: 'ward_incharge' },

  approvals: { type: [approvalSchema], default: [] },
  auditTrail: { type: [auditSchema], default: [] },

  paidAt: { type: Date },
  paymentMode: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'pending'], default: 'bank_transfer' },
  paymentReference: { type: String, trim: true },
  expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },

  policyCapApplied: { type: Boolean, default: false },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

function computeClaimedAmount(next) {
  this.claimedAmount = Math.round(
    (this.lineItems || []).reduce((sum, li) => sum + Number(li.amount || 0) + Number(li.taxAmount || 0), 0) * 100
  ) / 100;
  next();
}

claimSchema.pre('validate', computeClaimedAmount);
claimSchema.pre('save', computeClaimedAmount);

claimSchema.index({ status: 1, createdAt: -1 });
claimSchema.index({ employee: 1, status: 1 });
claimSchema.index({ claimType: 1 });

module.exports = mongoose.model('ReimbursementClaim', claimSchema);
module.exports.CLAIM_TYPES = CLAIM_TYPES;
module.exports.CLAIM_STATUSES = CLAIM_STATUSES;
module.exports.APPROVAL_STAGES = APPROVAL_STAGES;
