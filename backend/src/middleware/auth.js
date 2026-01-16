const passport = require('passport');

// Authenticate with JWT
const authenticate = passport.authenticate('jwt', { session: false });

// Role-based access control middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// Role hierarchy for easier permission checks
const roleHierarchy = {
  super_admin: ['super_admin', 'hospital_admin', 'doctor', 'receptionist', 'billing_staff'],
  hospital_admin: ['hospital_admin', 'doctor', 'receptionist', 'billing_staff'],
  doctor: ['doctor'],
  receptionist: ['receptionist'],
  billing_staff: ['billing_staff']
};

// Check if user can access based on hierarchy
const canAccess = (userRole, requiredRole) => {
  return roleHierarchy[userRole]?.includes(requiredRole) || false;
};

// Middleware to check ownership or admin
const authorizeOwnerOrAdmin = (ownerField = 'user') => {
  return (req, res, next) => {
    const resourceOwnerId = req.resource?.[ownerField]?.toString() || req.resource?.[ownerField];
    const userId = req.user._id.toString();
    
    if (resourceOwnerId === userId || canAccess(req.user.role, 'hospital_admin')) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to access this resource'
    });
  };
};

module.exports = {
  authenticate,
  authorize,
  authorizeOwnerOrAdmin,
  canAccess,
  roleHierarchy
};
