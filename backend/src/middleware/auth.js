const passport = require('passport');

// Authenticate with JWT
const authenticate = passport.authenticate('jwt', { session: false });

// Role-based access control middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const hasPermission = allowedRoles.some(requiredRole => canAccess(userRole, requiredRole));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// Permission-based access control middleware
const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.permissions || req.user.permissions.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have any permissions assigned'
      });
    }
    
    // Check if the user has any of the required permissions
    const hasRequiredPermission = requiredPermissions.some(permission => 
      req.user.permissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have sufficient permissions to access this resource'
      });
    }

    next();
  };
};

// Helper function to check if a user has a specific permission
const hasPermission = (user, permission) => {
  return user && user.permissions && user.permissions.includes(permission);
};

// Placeholder for all possible permissions in the system
const allPermissions = [
  'user:read', 'user:write', 'user:delete', // User management
  'patient:read', 'patient:write', 'patient:delete', // Patient management
  'bed:read', 'bed:write', 'bed:delete', 'bed:changeStatus', // Bed management
  'facility:read', 'facility:write', 'facility:delete', // Facility management
  'doctor:read', 'doctor:write', 'doctor:delete', // Doctor management
  'appointment:read', 'appointment:write', 'appointment:delete', // Appointment management
  'invoice:read', 'invoice:write', 'invoice:delete', // Invoice management
  'report:read', 'report:write', // Report management
  'settings:manage', // General settings management
];

const getAllPermissions = () => {
  return allPermissions;
};

// Role hierarchy for easier permission checks
const roleHierarchy = {
  super_admin: ['super_admin', 'hospital_admin', 'doctor', 'receptionist', 'billing_staff', 'nurse'],
  hospital_admin: ['hospital_admin', 'doctor', 'receptionist', 'billing_staff', 'nurse'],
  doctor: ['doctor'],
  receptionist: ['receptionist', 'nurse'],
  billing_staff: ['billing_staff'],
  nurse: ['nurse']
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
  authorizeRoles,
  authorize: authorizeRoles,
  authorizePermissions,
  authorizeOwnerOrAdmin,
  canAccess,
  roleHierarchy,
  hasPermission,
  getAllPermissions
};
