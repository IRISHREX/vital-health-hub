const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  heartRate: {
    value: { type: Number, required: true },
    unit: { type: String, default: 'bpm' },
    isAbnormal: { type: Boolean, default: false }
  },
  bloodPressure: {
    systolic: { type: Number, required: true },
    diastolic: { type: Number, required: true },
    unit: { type: String, default: 'mmHg' },
    isAbnormal: { type: Boolean, default: false }
  },
  temperature: {
    value: { type: Number, required: true },
    unit: { type: String, default: '°F' },
    isAbnormal: { type: Boolean, default: false }
  },
  oxygenSaturation: {
    value: { type: Number, required: true },
    unit: { type: String, default: '%' },
    isAbnormal: { type: Boolean, default: false }
  },
  respiratoryRate: {
    value: { type: Number },
    unit: { type: String, default: 'breaths/min' },
    isAbnormal: { type: Boolean, default: false }
  },
  notes: {
    type: String
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Check for abnormal values before saving
vitalSchema.pre('save', function(next) {
  // Heart rate: normal 60-100 bpm
  this.heartRate.isAbnormal = this.heartRate.value < 60 || this.heartRate.value > 100;
  
  // Blood pressure: normal systolic 90-120, diastolic 60-80
  this.bloodPressure.isAbnormal = 
    this.bloodPressure.systolic < 90 || 
    this.bloodPressure.systolic > 140 ||
    this.bloodPressure.diastolic < 60 || 
    this.bloodPressure.diastolic > 90;
  
  // Temperature: normal 97-99°F
  this.temperature.isAbnormal = this.temperature.value < 97 || this.temperature.value > 99.5;
  
  // Oxygen saturation: normal > 95%
  this.oxygenSaturation.isAbnormal = this.oxygenSaturation.value < 95;
  
  // Respiratory rate: normal 12-20 breaths/min
  if (this.respiratoryRate?.value) {
    this.respiratoryRate.isAbnormal = this.respiratoryRate.value < 12 || this.respiratoryRate.value > 20;
  }
  
  next();
});

// Index for querying patient vitals
vitalSchema.index({ patient: 1, recordedAt: -1 });

module.exports = mongoose.model('Vital', vitalSchema);
