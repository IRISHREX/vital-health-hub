const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true },
  route: { type: String, default: 'oral' },
  quantity: { type: Number, required: true },
  instructions: { type: String },
  dispensed: { type: Boolean, default: false },
  dispensedQty: { type: Number, default: 0 },
  dispensedAt: { type: Date }
});

const prescriptionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
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
