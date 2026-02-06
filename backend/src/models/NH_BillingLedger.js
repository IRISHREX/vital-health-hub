const mongoose = require('mongoose');

const billingLedgerSchema = new mongoose.Schema({
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission'
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  sourceType: {
    type: String,
    enum: ['service_order', 'bed_charge', 'nursing', 'pharmacy', 'procedure', 'manual', 'other'],
    default: 'manual'
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  category: {
    type: String,
    enum: ['bed_charges', 'doctor_fee', 'nursing', 'medication', 'procedure', 'lab_test', 'radiology', 'surgery', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recordedAt: {
    type: Date,
    default: Date.now
  },
  billed: {
    type: Boolean,
    default: false
  },
  billedAt: {
    type: Date
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }
}, {
  timestamps: true
});

billingLedgerSchema.index({ admission: 1, billed: 1 });
billingLedgerSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('BillingLedger', billingLedgerSchema);
