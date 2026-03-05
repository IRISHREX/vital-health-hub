const jwt = require('jsonwebtoken');
const GrandmasterUser = require('../models/GM_GrandmasterUser');
const config = require('../config');

/**
 * Middleware to authenticate Grandmaster/Platform Admin users.
 * Checks for the `isGrandmaster` flag in the JWT payload.
 */
const authenticateGrandmaster = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('❌ Missing or invalid Authorization header');
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    if (!decoded.isGrandmaster) {
      console.warn('❌ Not a grandmaster token:', decoded);
      return res.status(403).json({ success: false, message: 'Grandmaster access required' });
    }

    const user = await GrandmasterUser.findById(decoded.id);
    if (!user || !user.isActive) {
      console.warn('❌ Invalid or deactivated user:', decoded.id);
      return res.status(401).json({ success: false, message: 'Invalid or deactivated account' });
    }

    console.log(`✅ Authenticated grandmaster: ${user.email}`);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    next(error);
  }
};

/**
 * Only allow the top-level grandmaster role (not platform_admin).
 */
const requireGrandmaster = (req, res, next) => {
  if (req.user?.role !== 'grandmaster') {
    return res.status(403).json({ success: false, message: 'Only Grandmaster can perform this action' });
  }
  next();
};

module.exports = { authenticateGrandmaster, requireGrandmaster };
