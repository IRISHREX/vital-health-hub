const mongoose = require('mongoose');

const EXPENSE_MODULES = [
  'general', 'opd', 'ipd', 'lab', 'radiology', 'pharmacy', 'ot', 'nursing',
  'administration', 'housekeeping', 'billing', 'hr',
];

const EXPENSE_CATEGORIES = [
  'salary', 'consumables', 'medicines', 'equipment', 'maintenance', 'rent',
  'utilities', 'marketing', 'insurance', 'taxes', 'outsourced_services',
  'housekeeping', 'transport', 'refund', 'commission',
  'medicine_purchase', 'employee_salary', 'electricity_bill', 'water_bill',
  'internet_telephone', 'equipment_purchase', 'lab_reagents', 'oxygen_supply',
  'ambulance_fuel', 'laundry', 'security', 'custom', 'other',
];

const expenseSchema = new mongoose.Schema({
  expenseNumber: { type: String, trim: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  module: { type: String, enum: EXPENSE_MODULES, default: 'general', index: true },
  category: { type: String, enum: EXPENSE_CATEGORIES, default: 'other', index: true },
  // Free-text label used only when category === 'custom'.
  customCategory: { type: String, trim: true },
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

// Always recompute totalAmount from amount + taxAmount, on create AND update,
// so list totals / P&L aggregates (which $sum totalAmount) never go stale.
function computeTotal(next) {
  this.totalAmount = Number(this.amount || 0) + Number(this.taxAmount || 0);
  if (this.status === 'paid' && !this.paidAt) this.paidAt = this.date || new Date();
  if (this.category === 'custom' && !String(this.customCategory || '').trim()) {
    return next(new Error('Custom category label is required when category is "custom"'));
  }
  next();
}

expenseSchema.pre('validate', computeTotal);
expenseSchema.pre('save', computeTotal);

expenseSchema.index({ date: -1, module: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_MODULES = EXPENSE_MODULES;
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
