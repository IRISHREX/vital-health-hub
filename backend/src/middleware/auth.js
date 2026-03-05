const jwt = require('jsonwebtoken');
const BaseUser = require('../models/NH_User');
const {
  VisualAccessSettings: BaseVisualAccessSettings,
} = require('../models/NH_Settings');
const config = require('../config');
const { getModel } = require('../utils/tenantModel');

const getUserModel = (req) => getModel(req, 'User', BaseUser);
const getVisualAccessModel = (req) => getModel(req, 'VisualAccessSettings', BaseVisualAccessSettings);

// Authenticate with JWT and tenant-aware user lookup
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const User = getUserModel(req);
    const user = await User.findById(decoded.id).select('+permissions');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    return next(error);
  }
};

const modulePathMap = {
  '/dashboard': 'dashboard',
  '/beds': 'beds',
  '/admissions': 'admissions',
  '/patients': 'patients',
  '/doctors': 'doctors',
  '/nurse': 'nurses',
  '/appointments': 'appointments',
  '/facilities': 'facilities',
  '/billing': 'billing',
  '/invoices': 'billing',
  '/reports': 'reports',
  '/notifications': 'notifications',
  '/settings': 'settings',
  '/tasks': 'tasks',
  '/vitals': 'vitals',
  '/lab-tests': 'lab',
  '/pharmacy': 'pharmacy',
};

const methodActionMap = {
  GET: 'canView',
  HEAD: 'canView',
  OPTIONS: 'canView',
  POST: 'canCreate',
  PUT: 'canEdit',
  PATCH: 'canEdit',
  DELETE: 'canDelete',
};

const actionFeatureMap = {
  canView: 'view',
  canCreate: 'create',
  canEdit: 'edit',
  canDelete: 'delete',
};

const visualAccessCacheByTenant = new Map();
const VISUAL_ACCESS_CACHE_TTL_MS = 5000;

const getVisualAccessSettingsCached = async (req) => {
  const tenantKey = req?.tenant?.slug || 'default';
  const now = Date.now();
  const cached = visualAccessCacheByTenant.get(tenantKey);

  if (cached && now - cached.ts < VISUAL_ACCESS_CACHE_TTL_MS) {
    return cached.value;
  }

  const VisualAccessSettings = getVisualAccessModel(req);
  const value = await VisualAccessSettings.findOne().lean();
  visualAccessCacheByTenant.set(tenantKey, { value, ts: now });
  return value;
};

const resolveModuleFromRequest = (req) => {
  const path = String(req.baseUrl || req.originalUrl || '').toLowerCase();
  return Object.entries(modulePathMap).find(([prefix]) => path.includes(prefix))?.[1] || null;
};

const getUserOverrideContext = (settings, email, module) => {
  if (!settings || !email) {
    return { hasUserOverride: false, hasModuleOverride: false, moduleOverride: null };
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const userOverride = (settings.overrides || []).find(
    (entry) => String(entry?.email || '').trim().toLowerCase() === normalizedEmail
  );

  if (!userOverride) {
    return { hasUserOverride: false, hasModuleOverride: false, moduleOverride: null };
  }

  const moduleOverride = module
    ? (userOverride.modules || []).find((m) => m?.module === module) || null
    : null;

  return { hasUserOverride: true, hasModuleOverride: !!moduleOverride, moduleOverride };
};

// Role-based access control middleware
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    try {
      const module = resolveModuleFromRequest(req);
      const action = methodActionMap[req.method] || 'canView';
      const visualSettings = await getVisualAccessSettingsCached(req);
      const { hasModuleOverride, moduleOverride } = getUserOverrideContext(
        visualSettings,
        req.user.email,
        module
      );

      // If a module-specific override exists for this user, treat it as strict allow-list.
      if (hasModuleOverride) {
        const restrictedFeatures = (moduleOverride?.restrictedFeatures || []).map((feature) =>
          String(feature || '').trim().toLowerCase()
        );
        const requestedFeature = actionFeatureMap[action];
        const isRestricted = requestedFeature ? restrictedFeatures.includes(requestedFeature) : false;

        if (moduleOverride?.[action] && !isRestricted) {
          return next();
        }
        return res.status(403).json({
          success: false,
          message: isRestricted
            ? 'This functionality is restricted. Please request access from Super Admin.'
            : 'You do not have permission to access this resource',
        });
      }

      // Fall back to role-based control when no email override exists for the module.
      const userRole = req.user.role;
      const hasRolePermission = allowedRoles.some((requiredRole) => canAccess(userRole, requiredRole));

      if (!hasRolePermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource',
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

// Permission-based access control middleware
const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!req.user.permissions || req.user.permissions.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have any permissions assigned',
      });
    }

    // Check if the user has any of the required permissions
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      req.user.permissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have sufficient permissions to access this resource',
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
  'user:read',
  'user:write',
  'user:delete', // User management
  'patient:read',
  'patient:write',
  'patient:delete', // Patient management
  'bed:read',
  'bed:write',
  'bed:delete',
  'bed:changeStatus', // Bed management
  'facility:read',
  'facility:write',
  'facility:delete', // Facility management
  'doctor:read',
  'doctor:write',
  'doctor:delete', // Doctor management
  'appointment:read',
  'appointment:write',
  'appointment:delete', // Appointment management
  'invoice:read',
  'invoice:write',
  'invoice:delete', // Invoice management
  'report:read',
  'report:write', // Report management
  'settings:manage', // General settings management
];

const getAllPermissions = () => {
  return allPermissions;
};

// Role hierarchy for easier permission checks
const roleHierarchy = {
  super_admin: ['super_admin', 'hospital_admin', 'doctor', 'receptionist', 'billing_staff', 'nurse', 'head_nurse'],
  hospital_admin: ['hospital_admin', 'doctor', 'receptionist', 'billing_staff', 'nurse', 'head_nurse'],
  head_nurse: ['head_nurse', 'nurse'],
  doctor: ['doctor'],
  receptionist: ['receptionist', 'nurse'],
  billing_staff: ['billing_staff'],
  nurse: ['nurse'],
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
      message: 'You do not have permission to access this resource',
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
  getAllPermissions,
};
