const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema(
  {
    rule: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRule', required: true },
    ruleName: { type: String, default: '' },
    module: { type: String, required: true },
    action: { type: String, required: true },
    actionLabel: { type: String, default: '' },

    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterEmail: { type: String, required: true, lowercase: true, trim: true },
    requesterName: { type: String, default: '' },

    // Form payload submitted by requester
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Resource context (optional reference to the entity being acted on)
    resourceType: { type: String, default: '' },
    resourceId: { type: String, default: '' },

    // Approver target (snapshot at request time)
    approverType: { type: String, enum: ['email', 'role'], required: true },
    approverEmail: { type: String, lowercase: true, trim: true, default: '' },
    approverRole: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired', 'escalated'],
      default: 'pending',
      index: true
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedByEmail: { type: String, default: '' },
    reviewedAt: { type: Date },
    reviewComment: { type: String, default: '' },

    // SLA & escalation
    dueAt: { type: Date, required: true },
    escalated: { type: Boolean, default: false },
    escalatedAt: { type: Date },
    escalationTo: { type: String, default: '' },

    blocking: { type: String, enum: ['hard', 'soft'], default: 'hard' }
  },
  { timestamps: true }
);

approvalRequestSchema.index({ status: 1, createdAt: -1 });
approvalRequestSchema.index({ approverEmail: 1, status: 1 });
approvalRequestSchema.index({ approverRole: 1, status: 1 });
approvalRequestSchema.index({ requester: 1, status: 1 });
approvalRequestSchema.index({ status: 1, dueAt: 1, escalated: 1 });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
