const mongoose = require('mongoose');

// Hospital Settings Schema
const hospitalSettingsSchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    default: 'MediCare Multi-Specialty Hospital'
  },
  registrationNumber: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  // Billing Configuration
  gstNumber: {
    type: String,
    default: ''
  },
  defaultTaxRate: {
    type: Number,
    default: 18
  },
  currency: {
    type: String,
    default: 'INR'
  }
}, {
  timestamps: true
});

// Security Settings Schema
const securitySettingsSchema = new mongoose.Schema({
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  sessionTimeout: {
    type: Number,
    default: 30, // minutes
    enum: [15, 30, 60, 120]
  },
  passwordExpiry: {
    type: String,
    default: '90', // days or 'never'
    enum: ['30', '60', '90', 'never']
  },
  minPasswordLength: {
    type: Number,
    default: 6
  },
  requireSpecialChars: {
    type: Boolean,
    default: false
  },
  maxLoginAttempts: {
    type: Number,
    default: 5
  },
  lockoutDuration: {
    type: Number,
    default: 15 // minutes
  }
}, {
  timestamps: true
});

// Notification Settings Schema
const notificationSettingsSchema = new mongoose.Schema({
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsAlerts: {
    type: Boolean,
    default: false
  },
  pushNotifications: {
    type: Boolean,
    default: true
  },
  // Email specific settings
  appointmentReminders: {
    type: Boolean,
    default: true
  },
  billingAlerts: {
    type: Boolean,
    default: true
  },
  dischargeNotifications: {
    type: Boolean,
    default: true
  },
  emergencyAlerts: {
    type: Boolean,
    default: true
  },
  // SMS provider config
  smsProvider: {
    type: String,
    default: ''
  },
  smsApiKey: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// User Preferences Schema (per-user settings)
const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  theme: {
    type: String,
    default: 'light',
    enum: ['light', 'dark', 'system']
  },
  language: {
    type: String,
    default: 'en'
  },
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY'
  },
  timeFormat: {
    type: String,
    default: '12h',
    enum: ['12h', '24h']
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  desktopNotifications: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const visualAccessSettingsSchema = new mongoose.Schema({
  overrides: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    modules: [{
      module: {
        type: String,
        enum: [
          'dashboard', 'beds', 'admissions', 'patients', 'doctors',
          'nurses', 'appointments', 'facilities', 'billing', 'reports',
          'notifications', 'settings', 'tasks', 'lab', 'pharmacy'
        ],
        required: true
      },
      canView: { type: Boolean, default: false },
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false }
    }]
  }],
  permissionManagers: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const HospitalSettings = mongoose.model('HospitalSettings', hospitalSettingsSchema);
const SecuritySettings = mongoose.model('SecuritySettings', securitySettingsSchema);
const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);
const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);
const VisualAccessSettings = mongoose.model('VisualAccessSettings', visualAccessSettingsSchema);

module.exports = {
  HospitalSettings,
  SecuritySettings,
  NotificationSettings,
  UserPreferences,
  VisualAccessSettings
};
