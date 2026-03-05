const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ['nursing_home', 'hospital', 'diagnostic_center', 'clinic'], required: true },

    // Contact & Address
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' },
    },
    phone: String,
    email: { type: String, lowercase: true, trim: true },
    website: String,
    logo: String,

    // Admin details set during onboarding
    adminDetails: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: String,
    },

    // Database isolation - each org gets its own MongoDB database
    dbName: { type: String, required: true, unique: true },
    dbUri: { type: String, trim: true, select: false },

    // Module access - controlled by grandmaster
    enabledModules: {
      type: [String],
      default: ['dashboard', 'patients', 'beds', 'admissions'],
      enum: [
        'dashboard',
        'beds',
        'admissions',
        'patients',
        'doctors',
        'nurses',
        'appointments',
        'facilities',
        'billing',
        'reports',
        'notifications',
        'settings',
        'tasks',
        'vitals',
        'lab',
        'pharmacy',
        'radiology',
        'ot',
        'opd',
        'ipd',
        'inventory',
      ],
    },

    // Status
    status: { type: String, enum: ['active', 'suspended', 'onboarding', 'deactivated'], default: 'onboarding' },

    // Limits
    maxUsers: { type: Number, default: 50 },
    maxBeds: { type: Number, default: 100 },

    // Metadata
    onboardedAt: Date,
    suspendedAt: Date,
    suspendReason: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

organizationSchema.index({ status: 1 });
organizationSchema.index({ 'adminDetails.email': 1 });

module.exports = mongoose.model('GM_Organization', organizationSchema);
