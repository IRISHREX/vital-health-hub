const mongoose = require('mongoose');

const handoverSchema = new mongoose.Schema({
  handoverNo: { type: String, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  fromNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shift: { type: String, enum: ['morning', 'evening', 'night', 'custom'], default: 'custom' },
  // SBAR
  situation: { type: String },
  background: { type: String },
  assessment: { type: String },
  recommendation: { type: String },
  // Snapshot fields
  vitalsSnapshot: { type: mongoose.Schema.Types.Mixed },
  pendingTasks: [{ type: String }],
  activeIVs: [{ type: String }],
  activeMedications: [{ type: String }],
  alerts: [{ type: String }],
  allergies: [{ type: String }],
  // Ack workflow (reuses existing accept/reject)
  status: {
    type: String,
    enum: ['submitted', 'acknowledged', 'rejected', 'expired'],
    default: 'submitted',
    index: true
  },
  respondedAt: { type: Date },
  responseNotes: { type: String }
}, { timestamps: true });

handoverSchema.index({ toNurse: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Handover', handoverSchema);
