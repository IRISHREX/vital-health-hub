const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      email: { type: String, required: true },
      name: { type: String },
      role: { type: String },
    },

    // What action was performed
    action: {
      type: String,
      required: true,
      enum: [
        'impersonate_org',
        'update_settings_tabs',
        'update_payment_config',
        'proxy_create',
        'proxy_update',
        'proxy_delete',
        'onboard_org',
        'update_org',
        'update_org_modules',
        'suspend_org',
        'reactivate_org',
        'delete_org',
        'create_admin',
        'update_admin',
        'delete_admin',
        'create_notice',
        'update_notice',
        'delete_notice',
        'upsert_config',
        'delete_config',
      ],
    },

    // Target organization (if applicable)
    targetOrg: {
      orgId: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String },
      slug: { type: String },
    },

    // Additional context
    details: { type: mongoose.Schema.Types.Mixed, default: {} },

    // IP & user agent
    ip: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'actor.userId': 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'targetOrg.orgId': 1, createdAt: -1 });

module.exports = mongoose.model('GM_AuditLog', auditLogSchema);
