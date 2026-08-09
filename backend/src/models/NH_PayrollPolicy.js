const mongoose = require('mongoose');

const taxSlabSchema = new mongoose.Schema({
  upTo: { type: Number, required: true }, // Infinity represented as -1 in stored doc for "and above"
  percent: { type: Number, required: true, min: 0 },
}, { _id: false });

const payrollPolicySchema = new mongoose.Schema({
  name: { type: String, trim: true, default: 'Default Payroll Policy' },
  monthDaysBasis: { type: String, enum: ['calendar', 'fixed_30'], default: 'calendar' },
  incomeTaxSlabs: {
    type: [taxSlabSchema],
    default: () => ([
      { upTo: 250000, percent: 0 },
      { upTo: 500000, percent: 5 },
      { upTo: 1000000, percent: 20 },
      { upTo: -1, percent: 30 },
    ]),
  },
  pfWageCeiling: { type: Number, default: 15000, min: 0 },
  esiWageCeiling: { type: Number, default: 21000, min: 0 },
  professionalTaxDefault: { type: Number, default: 200, min: 0 },
  nightShiftWindow: {
    start: { type: String, default: '22:00' },
    end: { type: String, default: '06:00' },
  },
  overtimeAfterHoursPerDay: { type: Number, default: 8, min: 0 },
  roundingMode: { type: String, enum: ['nearest', 'up', 'down'], default: 'nearest' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.models.PayrollPolicy || mongoose.model('PayrollPolicy', payrollPolicySchema);
