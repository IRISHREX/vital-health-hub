const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  admissionId: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  bed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    required: true
  },
  admittingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  attendingDoctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }],
  admissionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedDischargeDate: Date,
  actualDischargeDate: Date,
  admissionType: {
    type: String,
    enum: ['emergency', 'elective', 'transfer'],
    required: true
  },
  diagnosis: {
    primary: String,
    secondary: [String],
    icdCodes: [String]
  },
  symptoms: [String],
  treatmentPlan: String,
  vitals: [{
    recordedAt: { type: Date, default: Date.now },
    bloodPressure: String,
    heartRate: Number,
    temperature: Number,
    oxygenSaturation: Number,
    respiratoryRate: Number,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }
  }],
  procedures: [{
    name: String,
    performedAt: Date,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    notes: String,
    cost: Number
  }],
  labTests: [{
    testName: String,
    orderedAt: Date,
    completedAt: Date,
    results: String,
    orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    cost: Number
  }],
  status: {
    type: String,
    enum: ['admitted', 'discharged', 'transferred', 'deceased'],
    default: 'admitted'
  },
  dischargeNotes: String,
  dischargeSummary: String,
  dischargedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  totalDays: Number,
  admittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate total days on discharge
admissionSchema.pre('save', function(next) {
  if (this.actualDischargeDate && this.admissionDate) {
    const diffTime = Math.abs(this.actualDischargeDate - this.admissionDate);
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }
  next();
});

// Auto-generate admission ID
admissionSchema.pre('save', async function(next) {
  if (!this.admissionId) {
    const count = await mongoose.model('Admission').countDocuments();
    this.admissionId = `ADM${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Admission', admissionSchema);
