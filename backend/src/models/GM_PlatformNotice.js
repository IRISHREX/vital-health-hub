const mongoose = require('mongoose');

const platformNoticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['info', 'warning', 'critical', 'maintenance', 'subscription', 'policy'],
    default: 'info'
  },
  
  // Targeting
  scope: { type: String, enum: ['all', 'specific'], default: 'all' },
  targetOrganizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GM_Organization' }],

  // Scheduling
  publishAt: { type: Date, default: Date.now },
  expiresAt: Date,

  // Status
  isPublished: { type: Boolean, default: true },

  // Tracking
  readBy: [{
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'GM_Organization' },
    readAt: { type: Date, default: Date.now }
  }],

  createdBy: String // grandmaster admin email
}, {
  timestamps: true
});

platformNoticeSchema.index({ isPublished: 1, publishAt: -1 });

module.exports = mongoose.model('GM_PlatformNotice', platformNoticeSchema);
