const mongoose = require('mongoose');

const EXPENSE_MODULES = [
  'general', 'opd', 'ipd', 'lab', 'radiology', 'pharmacy', 'ot', 'nursing',
  'administration', 'housekeeping', 'billing', 'hr',
];

const EXPENSE_CATEGORIES = [
  'salary', 'consumables', 'medicines', 'equipment', 'maintenance', 'rent',
  'utilities', 'marketing', 'insurance', 'taxes', 'outsourced_services',
  'housekeeping', 'transport', 'refund', 'commission', 'other',
];

const expenseSchema = new mongoose.Schema({
  expenseNumber: { type: String, trim: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  module: { type: String, enum: EXPENSE_MODULES, default: 'general', index: true },
  category: { type: String, enum: EXPENSE_CATEGORIES, default: 'other', index: true },
  description: { type: String, required: true, trim: true },
  vendorName: { type: String, trim: true },
  invoiceReference: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0, min: 0 },
  paymentMode: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'pending'], default: 'cash' },
  status: { type: String, enum: ['paid', 'pending', 'cancelled'], default: 'paid' },
  paidAt: { type: Date },
  // Optional links so payroll / commission postings stay traceable.
  sourceType: { type: String, enum: ['manual', 'payroll', 'commission', 'refund', 'purchase'], default: 'manual' },
  sourceId: { type: mongoose.Schema.Types.ObjectId },
  attachmentUrl: { type: String, trim: true },
  notes: { type: String, trim: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

expenseSchema.pre('save', function computeTotal(next) {
  this.totalAmount = Number(this.amount || 0) + Number(this.taxAmount || 0);
  if (this.status === 'paid' && !this.paidAt) this.paidAt = this.date || new Date();
  next();
});

expenseSchema.index({ date: -1, module: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_MODULES = EXPENSE_MODULES;
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
