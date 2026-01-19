const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null]
  },
  registrationType: {
    type: String,
    enum: ['opd', 'ipd', 'emergency'],
    default: 'opd'
  },
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    notes: String
  }],
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  assignedBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed'
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  status: {
    type: String,
    enum: ['active', 'discharged', 'transferred', 'deceased'],
    default: 'active'
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility'
  }
}, {
  timestamps: true
});

// Generate patient ID before saving
patientSchema.pre('save', async function(next) {
  if (!this.patientId) {
    const count = await this.constructor.countDocuments();
    this.patientId = `PAT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Index for common queries
patientSchema.index({ firstName: 1, lastName: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ registrationType: 1 });
patientSchema.index({ assignedDoctor: 1 });
patientSchema.index({ assignedBed: 1 });

module.exports = mongoose.model('Patient', patientSchema);
