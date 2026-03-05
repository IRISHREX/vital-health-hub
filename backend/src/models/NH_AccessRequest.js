const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requesterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    module: {
      type: String,
      required: true,
      enum: [
        'dashboard', 'beds', 'admissions', 'patients', 'doctors',
        'nurses', 'appointments', 'facilities', 'billing', 'reports',
        'notifications', 'settings', 'tasks', 'lab', 'pharmacy'
      ]
    },
    feature: {
      type: String,
      required: true,
      enum: ['view', 'create', 'edit', 'delete']
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewComment: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

accessRequestSchema.index({ requester: 1, module: 1, feature: 1, status: 1 });
accessRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
