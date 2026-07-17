const mongoose = require('mongoose');

const nursingChargeSchema = new mongoose.Schema({
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  chargeType: {
    type: String,
    enum: ['procedure', 'iv_line', 'dressing', 'catheter', 'monitoring', 'injection', 'nebulization', 'suction', 'other'],
    required: true
  },
  serviceCatalog: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCatalog' },
  description: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  ledgerEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingLedger' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedAt: { type: Date, default: Date.now },
  notes: { type: String },
  cancelled: { type: Boolean, default: false },
  cancelledAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelReason: { type: String }
}, { timestamps: true });

nursingChargeSchema.index({ admission: 1, performedAt: -1 });

module.exports = mongoose.model('NursingCharge', nursingChargeSchema);
