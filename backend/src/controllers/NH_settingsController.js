const { HospitalSettings, SecuritySettings, NotificationSettings, UserPreferences, VisualAccessSettings } = require('../models/NH_Settings');
const { AppError } = require('../middleware/errorHandler');

// ============ HOSPITAL SETTINGS ============

// @desc    Get hospital settings
// @route   GET /api/settings/hospital
// @access  Private (Admin)
exports.getHospitalSettings = async (req, res, next) => {
  try {
    let settings = await HospitalSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await HospitalSettings.create({});
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update hospital settings
// @route   PUT /api/settings/hospital
// @access  Private (Super Admin, Hospital Admin)
exports.updateHospitalSettings = async (req, res, next) => {
  try {
    const {
      hospitalName,
      registrationNumber,
      address,
      phone,
      email,
      website,
      logo,
      gstNumber,
      defaultTaxRate,
      currency
    } = req.body;

    let settings = await HospitalSettings.findOne();
    
    if (!settings) {
      settings = await HospitalSettings.create(req.body);
    } else {
      settings = await HospitalSettings.findOneAndUpdate(
        {},
        {
          hospitalName,
          registrationNumber,
          address,
          phone,
          email,
          website,
          logo,
          gstNumber,
          defaultTaxRate,
          currency
        },
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      message: 'Hospital settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// ============ SECURITY SETTINGS ============

// @desc    Get security settings
// @route   GET /api/settings/security
// @access  Private (Admin)
exports.getSecuritySettings = async (req, res, next) => {
  try {
    let settings = await SecuritySettings.findOne();
    
    if (!settings) {
      settings = await SecuritySettings.create({});
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update security settings
// @route   PUT /api/settings/security
// @access  Private (Super Admin)
exports.updateSecuritySettings = async (req, res, next) => {
  try {
    const {
      twoFactorEnabled,
      sessionTimeout,
      passwordExpiry,
      minPasswordLength,
      requireSpecialChars,
      maxLoginAttempts,
      lockoutDuration
    } = req.body;

    let settings = await SecuritySettings.findOne();
    
    if (!settings) {
      settings = await SecuritySettings.create(req.body);
    } else {
      settings = await SecuritySettings.findOneAndUpdate(
        {},
        {
          twoFactorEnabled,
          sessionTimeout,
          passwordExpiry,
          minPasswordLength,
          requireSpecialChars,
          maxLoginAttempts,
          lockoutDuration
        },
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      message: 'Security settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// ============ NOTIFICATION SETTINGS ============

// @desc    Get notification settings
// @route   GET /api/settings/notifications
// @access  Private (Admin)
exports.getNotificationSettings = async (req, res, next) => {
  try {
    let settings = await NotificationSettings.findOne();
    
    if (!settings) {
      settings = await NotificationSettings.create({});
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification settings
// @route   PUT /api/settings/notifications
// @access  Private (Super Admin, Hospital Admin)
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const {
      emailNotifications,
      smsAlerts,
      pushNotifications,
      appointmentReminders,
      billingAlerts,
      dischargeNotifications,
      emergencyAlerts,
      smsProvider,
      smsApiKey
    } = req.body;

    let settings = await NotificationSettings.findOne();
    
    if (!settings) {
      settings = await NotificationSettings.create(req.body);
    } else {
      settings = await NotificationSettings.findOneAndUpdate(
        {},
        {
          emailNotifications,
          smsAlerts,
          pushNotifications,
          appointmentReminders,
          billingAlerts,
          dischargeNotifications,
          emergencyAlerts,
          smsProvider,
          smsApiKey
        },
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// ============ USER PREFERENCES ============

// @desc    Get user preferences
// @route   GET /api/settings/preferences
// @access  Private
exports.getUserPreferences = async (req, res, next) => {
  try {
    let preferences = await UserPreferences.findOne({ userId: req.user._id });
    
    if (!preferences) {
      preferences = await UserPreferences.create({ userId: req.user._id });
    }
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user preferences
// @route   PUT /api/settings/preferences
// @access  Private
exports.updateUserPreferences = async (req, res, next) => {
  try {
    const {
      theme,
      language,
      dateFormat,
      timeFormat,
      emailNotifications,
      desktopNotifications
    } = req.body;

    let preferences = await UserPreferences.findOne({ userId: req.user._id });
    
    if (!preferences) {
      preferences = await UserPreferences.create({
        userId: req.user._id,
        ...req.body
      });
    } else {
      preferences = await UserPreferences.findOneAndUpdate(
        { userId: req.user._id },
        {
          theme,
          language,
          dateFormat,
          timeFormat,
          emailNotifications,
          desktopNotifications
        },
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

// ============ USER MANAGEMENT (for Settings page) ============

// @desc    Get user stats by role
// @route   GET /api/settings/users/stats
// @access  Private (Admin)
exports.getUserStats = async (req, res, next) => {
  try {
    const { User } = require('../models');
    
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const roleStats = stats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        superAdmin: roleStats.super_admin || 0,
        hospitalAdmin: roleStats.hospital_admin || 0,
        doctor: roleStats.doctor || 0,
        nurse: roleStats.nurse || 0,
        receptionist: roleStats.receptionist || 0,
        billingStaff: roleStats.billing_staff || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============ VISUAL ACCESS SETTINGS ============

// @desc    Get visual access settings
// @route   GET /api/settings/visual-access
// @access  Private
exports.getVisualAccessSettings = async (req, res, next) => {
  try {
    let settings = await VisualAccessSettings.findOne();
    if (!settings) {
      settings = await VisualAccessSettings.create({ overrides: [], permissionManagers: [] });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update visual access settings
// @route   PUT /api/settings/visual-access
// @access  Private (Super Admin, Hospital Admin)
exports.updateVisualAccessSettings = async (req, res, next) => {
  try {
    const { overrides = [], permissionManagers = [] } = req.body;
    let settings = await VisualAccessSettings.findOne();
    if (!settings) {
      settings = await VisualAccessSettings.create({ overrides: [], permissionManagers: [] });
    }

    const userEmail = String(req.user?.email || "").trim().toLowerCase();
    const isSuperAdmin = req.user?.role === "super_admin";
    const delegatedManagers = (settings.permissionManagers || []).map((email) => String(email || "").trim().toLowerCase());
    const isDelegatedManager = delegatedManagers.includes(userEmail);

    if (!isSuperAdmin && !isDelegatedManager) {
      throw new AppError('Not authorized to update visual access settings', 403);
    }

    const sanitizedOverrides = (Array.isArray(overrides) ? overrides : [])
      .filter((entry) => entry?.email)
      .map((entry) => ({
        email: String(entry.email).trim().toLowerCase(),
        modules: (Array.isArray(entry.modules) ? entry.modules : [])
          .filter((mod) => mod?.module)
          .map((mod) => ({
            module: mod.module,
            canView: !!mod.canView,
            canCreate: !!mod.canCreate,
            canEdit: !!mod.canEdit,
            canDelete: !!mod.canDelete
          }))
      }));

    const nextPayload = {
      overrides: sanitizedOverrides,
      updatedBy: req.user?._id
    };

    if (isSuperAdmin) {
      nextPayload.permissionManagers = (Array.isArray(permissionManagers) ? permissionManagers : [])
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean);
    }

    settings = await VisualAccessSettings.findOneAndUpdate(
      {},
      nextPayload,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Visual access settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// ============ ALL SETTINGS ============

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private (Admin)
exports.getAllSettings = async (req, res, next) => {
  try {
    let hospital = await HospitalSettings.findOne();
    let security = await SecuritySettings.findOne();
    let notifications = await NotificationSettings.findOne();
    let preferences = await UserPreferences.findOne({ userId: req.user._id });
    let visualAccess = await VisualAccessSettings.findOne();
    
    // Create defaults if needed
    if (!hospital) hospital = await HospitalSettings.create({});
    if (!security) security = await SecuritySettings.create({});
    if (!notifications) notifications = await NotificationSettings.create({});
    if (!preferences) preferences = await UserPreferences.create({ userId: req.user._id });
    if (!visualAccess) visualAccess = await VisualAccessSettings.create({ overrides: [], permissionManagers: [] });

    res.json({
      success: true,
      data: {
        hospital,
        security,
        notifications,
        preferences,
        visualAccess
      }
    });
  } catch (error) {
    next(error);
  }
};
