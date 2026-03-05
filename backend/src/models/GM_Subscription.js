const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['bank_transfer', 'upi', 'card', 'cash', 'cheque', 'other'], default: 'other' },
  reference: String,
  paidAt: { type: Date, default: Date.now },
  notes: String
}, { _id: true, timestamps: false });

const subscriptionSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'GM_Organization', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'GM_SubscriptionPlan', required: true },
  
  billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  // Dates
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  renewalDate: Date,

  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'trial', 'grace_period'],
    default: 'active'
  },

  // Payment history
  payments: [paymentSchema],

  // Auto-renew
  autoRenew: { type: Boolean, default: false },
  
  // Grace period (days after expiry before access is cut)
  gracePeriodDays: { type: Number, default: 7 },

  notes: String
}, {
  timestamps: true
});

subscriptionSchema.index({ organization: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

// Virtual: is subscription currently valid
subscriptionSchema.virtual('isValid').get(function() {
  if (this.status === 'active' || this.status === 'trial') return true;
  if (this.status === 'grace_period') {
    const graceEnd = new Date(this.endDate);
    graceEnd.setDate(graceEnd.getDate() + this.gracePeriodDays);
    return new Date() <= graceEnd;
  }
  return false;
});

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GM_Subscription', subscriptionSchema);
