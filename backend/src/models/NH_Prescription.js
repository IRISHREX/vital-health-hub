const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  medicineName: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true },
  route: { type: String, default: 'oral' },
  quantity: { type: Number, required: true },
  instructions: { type: String },
  dispensed: { type: Boolean, default: false },
  dispensedQty: { type: Number, default: 0 },
  dispensedAt: { type: Date },
  stockRequestRaised: { type: Boolean, default: false }
});

const prescriptionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  encounterType: {
    type: String,
    enum: ['opd', 'ipd', 'emergency'],
    default: 'opd'
  },
  complaints: [{ type: String }],
  medicalHistory: [{ type: String }],
  diagnosis: { type: String },
  followUpDate: { type: Date },
  vitals: {
    bloodPressure: { type: String },
    pulseRate: { type: String },
    spo2: { type: String },
    temperature: { type: String },
    heightCm: { type: String },
    weightKg: { type: String },
    bmi: { type: String },
    others: { type: String }
  },
  femaleHealth: {
    gravida: { type: String },
    parityA: { type: String },
    parityB: { type: String },
    lmp: { type: Date },
    edd: { type: Date },
    pog: { type: String },
    lcb: { type: String },
    mod: { type: String }
  },
  testAdvice: [{
    testName: { type: String, required: true },
    testType: { type: String },
    instructions: { type: String }
  }],
  items: [prescriptionItemSchema],
  status: {
    type: String,
    enum: ['active', 'partially_dispensed', 'fully_dispensed', 'cancelled'],
    default: 'active'
  },
  notes: { type: String },
  prescribedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

prescriptionSchema.index({ patient: 1, status: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
