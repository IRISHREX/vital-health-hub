const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: String,
  description: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  metadata: {},
  createdAt: { type: Date, default: Date.now }
});

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
