const mongoose = require('mongoose');

const fluidIOSchema = new mongoose.Schema({
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  ts: { type: Date, default: Date.now, index: true },
  direction: { type: String, enum: ['in', 'out'], required: true },
  source: {
    type: String,
    enum: ['IV', 'Oral', 'NG', 'Enteral', 'Blood', 'Urine', 'Drain', 'Vomit', 'Stool', 'Sweat', 'Other'],
    required: true
  },
  volumeMl: { type: Number, required: true, min: 0 },
  notes: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

fluidIOSchema.index({ admission: 1, ts: -1 });

module.exports = mongoose.model('FluidIO', fluidIOSchema);
