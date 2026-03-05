const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  
  // Pricing
  priceMonthly: { type: Number, required: true, min: 0 },
  priceYearly: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },

  // Included modules
  includedModules: {
    type: [String],
    required: true,
    enum: [
      'dashboard', 'beds', 'admissions', 'patients', 'doctors', 'nurses',
      'appointments', 'facilities', 'billing', 'reports', 'notifications',
      'settings', 'tasks', 'vitals', 'lab', 'pharmacy', 'radiology', 'ot',
      'opd', 'ipd', 'inventory'
    ]
  },

  // Limits
  maxUsers: { type: Number, default: 50 },
  maxBeds: { type: Number, default: 100 },
  maxPatients: { type: Number, default: 0 }, // 0 = unlimited

  // Status
  isActive: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('GM_SubscriptionPlan', subscriptionPlanSchema);
