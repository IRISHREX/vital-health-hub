const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    sparse: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    notes: String
  }],
  allergies: [String],
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String
  }],
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    validTill: Date
  },
  status: {
    type: String,
    enum: ['active', 'admitted', 'discharged', 'inactive'],
    default: 'active'
  },
  registrationType: {
    type: String,
    enum: ['opd', 'ipd', 'emergency'],
    default: 'opd'
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  assignedBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed'
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Admission tracking
  currentAdmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission'
  },
  admissionStatus: {
    type: String,
    enum: ['ADMITTED', 'DISCHARGED', 'TRANSFERRED'],
    default: 'DISCHARGED'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
patientSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Auto-generate patient ID
patientSchema.pre('save', async function(next) {
  if (!this.patientId) {
    const count = await this.constructor.countDocuments();
    this.patientId = `PAT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Delete invoices when patient is deleted
patientSchema.post('findByIdAndDelete', async function(doc) {
  if (doc) {
    // Require Invoice model to avoid circular dependency
    const Invoice = require('./Invoice');
    await Invoice.deleteMany({ patient: doc._id });
  }
});

// Index for search
patientSchema.index({ firstName: 'text', lastName: 'text', patientId: 'text', phone: 'text' });

module.exports = mongoose.model('Patient', patientSchema);
