const AuditLog = require('../models/GM_AuditLog');

/**
 * Log a grandmaster audit event.
 * @param {Object} req - Express request (must have req.user from GM auth)
 * @param {string} action - Action enum value
 * @param {Object} [opts] - Optional details
 * @param {Object} [opts.targetOrg] - { orgId, name, slug }
 * @param {Object} [opts.details] - Free-form details object
 */
const logAudit = async (req, action, opts = {}) => {
  try {
    const user = req.user || {};
    await AuditLog.create({
      actor: {
        userId: user._id || user.id,
        email: user.email || 'unknown',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: user.role || 'grandmaster',
      },
      action,
      targetOrg: opts.targetOrg || {},
      details: opts.details || {},
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
};

module.exports = { logAudit };
