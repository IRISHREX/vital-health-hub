const mongoose = require('mongoose');

const referralCommissionSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'Referrer', required: true, index: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  invoiceNumber: { type: String, trim: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName: { type: String, trim: true },
  module: { type: String, trim: true, default: 'general' },
  baseAmount: { type: Number, required: true, min: 0 },
  percentage: { type: Number, required: true, min: 0 },
  commissionAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['accrued', 'approved', 'paid', 'cancelled'],
    default: 'accrued',
    index: true
  },
  accruedAt: { type: Date, default: Date.now },
  paidAt: { type: Date },
  paymentReference: { type: String, trim: true },
  cancelReason: { type: String, trim: true },
  notes: { type: String, trim: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// One commission row per invoice per referrer (idempotent accrual).
referralCommissionSchema.index({ invoice: 1, referrer: 1 }, { unique: true });
referralCommissionSchema.index({ accruedAt: -1 });

module.exports = mongoose.model('ReferralCommission', referralCommissionSchema);
