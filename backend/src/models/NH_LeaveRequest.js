const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, trim: true, index: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  employeeName: { type: String, trim: true },
  leaveType: { type: String, enum: ['casual', 'sick', 'earned', 'unpaid'], default: 'casual' },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  days: { type: Number, default: 1, min: 0.5 },
  reason: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: { type: Date },
  decisionNote: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

leaveRequestSchema.index({ status: 1, from: -1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
