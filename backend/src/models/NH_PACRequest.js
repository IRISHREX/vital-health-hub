const mongoose = require('mongoose');

const pacRequestSchema = new mongoose.Schema({
  pacNo: { type: String, index: true },
  surgery: { type: mongoose.Schema.Types.ObjectId, ref: 'Surgery', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  anesthetist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledFor: { type: Date },
  status: {
    type: String,
    enum: ['requested', 'scheduled', 'in_progress', 'completed', 'cleared', 'deferred', 'not_cleared', 'cancelled'],
    default: 'requested',
    index: true
  },
  assessment: {
    airway: { type: String },
    asaGrade: { type: String, enum: ['I', 'II', 'III', 'IV', 'V', 'VI', ''], default: '' },
    comorbidities: [{ type: String }],
    allergies: [{ type: String }],
    medications: [{ type: String }],
    fastingStatus: { type: String },
    labsReviewed: [{ type: String }],
    ecgReviewed: { type: Boolean, default: false },
    notes: { type: String }
  },
  clearance: {
    status: { type: String, enum: ['pending', 'cleared', 'conditional', 'not_cleared'], default: 'pending' },
    conditions: { type: String },
    notes: { type: String },
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signedAt: { type: Date }
  },
  overrides: [{
    reason: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('PACRequest', pacRequestSchema);
