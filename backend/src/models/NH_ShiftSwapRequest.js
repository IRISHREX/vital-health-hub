const mongoose = require('mongoose');

const shiftSwapRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, required: true, trim: true, unique: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  requesterAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'RosterAssignment', required: true },
  counterparty: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  counterpartyAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'RosterAssignment', required: true },
  reason: { type: String, trim: true },
  peerStatus: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: { type: Date },
  decisionNote: { type: String, trim: true },
  status: {
    type: String,
    enum: ['open', 'peer_accepted', 'approved', 'rejected', 'cancelled', 'applied'],
    default: 'open',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

shiftSwapRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ShiftSwapRequest', shiftSwapRequestSchema);
