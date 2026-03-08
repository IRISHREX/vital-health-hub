const AuditLog = require('../models/GM_AuditLog');

// List audit logs with filters and pagination
exports.list = async (req, res, next) => {
  try {
    const { action, orgId, actorId, page = 1, limit = 50, sort = '-createdAt' } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (orgId) filter['targetOrg.orgId'] = orgId;
    if (actorId) filter['actor.userId'] = actorId;

    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort(sort).skip((page - 1) * limit).limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, data, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    next(error);
  }
};

// Get single audit log entry
exports.getById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Audit log not found' });
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// Get audit stats summary
exports.stats = async (req, res, next) => {
  try {
    const [byAction, recentCount] = await Promise.all([
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      success: true,
      data: {
        byAction: byAction.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {}),
        last24h: recentCount,
        total: await AuditLog.estimatedDocumentCount(),
      },
    });
  } catch (error) {
    next(error);
  }
};
