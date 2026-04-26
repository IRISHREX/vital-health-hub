const express = require('express');
const router = express.Router();
const PlatformNotice = require('../models/GM_PlatformNotice');
const { authenticate } = require('../middleware/auth');

/**
 * Hospital-side feed of active platform announcements / alerts.
 * Returns notices that are:
 *  - published
 *  - within their publish/expire window
 *  - scoped to "all" OR explicitly targeted at the current organization
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const orgId = req.tenant?.organizationId;
    const now = new Date();

    const filter = {
      isPublished: true,
      $and: [
        { $or: [{ publishAt: { $lte: now } }, { publishAt: null }, { publishAt: { $exists: false } }] },
        { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }, { expiresAt: { $exists: false } }] },
      ],
      $or: [
        { scope: 'all' },
        ...(orgId ? [{ scope: 'specific', targetOrganizations: orgId }] : []),
      ],
    };

    const notices = await PlatformNotice.find(filter)
      .select('-readBy')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: notices });
  } catch (error) { next(error); }
});

module.exports = router;
