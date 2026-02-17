const { HospitalSettings, SecuritySettings, NotificationSettings, UserPreferences, VisualAccessSettings, DataManagementSettings } = require('../models/NH_Settings');
const { AppError } = require('../middleware/errorHandler');
const { User, Notification, AccessRequest, Bed, Doctor, Medicine, LabTestCatalog, Patient, Invoice } = require('../models');
const { DEFAULT_ASSIGNMENT_POLICIES, normalizeAssignmentPolicies } = require('../utils/assignmentPermissions');

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
      settings = await VisualAccessSettings.create({
        overrides: [],
        permissionManagers: [],
        assignmentPolicies: DEFAULT_ASSIGNMENT_POLICIES
      });
    }

    if (!settings.assignmentPolicies) {
      settings.assignmentPolicies = DEFAULT_ASSIGNMENT_POLICIES;
      await settings.save();
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
    const { overrides = [], permissionManagers = [], assignmentPolicies = DEFAULT_ASSIGNMENT_POLICIES } = req.body;
    let settings = await VisualAccessSettings.findOne();
    if (!settings) {
      settings = await VisualAccessSettings.create({
        overrides: [],
        permissionManagers: [],
        assignmentPolicies: DEFAULT_ASSIGNMENT_POLICIES
      });
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
            canDelete: !!mod.canDelete,
            restrictedFeatures: (Array.isArray(mod.restrictedFeatures) ? mod.restrictedFeatures : [])
              .map((feature) => String(feature || "").trim().toLowerCase())
              .filter((feature) => [
                'view',
                'create',
                'edit',
                'delete',
                'billing_opd',
                'billing_ipd',
                'billing_emergency',
                'billing_lab',
                'billing_radiology',
                'billing_pharmacy',
                'billing_ot',
                'billing_other'
              ].includes(feature))
          }))
      }));

    const nextPayload = {
      overrides: sanitizedOverrides,
      assignmentPolicies: normalizeAssignmentPolicies(assignmentPolicies),
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

// @desc    Create advanced access request for a restricted feature
// @route   POST /api/settings/access-requests
// @access  Private
exports.createAccessRequest = async (req, res, next) => {
  try {
    const moduleName = String(req.body?.module || "").trim().toLowerCase();
    const feature = String(req.body?.feature || "").trim().toLowerCase();
    const reason = String(req.body?.reason || "").trim();

    if (!moduleName || !feature) {
      throw new AppError('module and feature are required', 400);
    }

    if (!['view', 'create', 'edit', 'delete'].includes(feature)) {
      throw new AppError('Invalid feature', 400);
    }

    const existingPending = await AccessRequest.findOne({
      requester: req.user._id,
      module: moduleName,
      feature,
      status: 'pending'
    });

    if (existingPending) {
      throw new AppError('A pending request already exists for this feature', 409);
    }

    const request = await AccessRequest.create({
      requester: req.user._id,
      requesterEmail: req.user.email,
      module: moduleName,
      feature,
      reason,
      status: 'pending'
    });

    const superAdmins = await User.find({ role: 'super_admin', isActive: true }).select('_id');
    const notifications = superAdmins.map((admin) => ({
      recipient: admin._id,
      type: 'access_request',
      title: 'Access Request Pending',
      message: `${req.user.email} requested ${feature} access for ${moduleName}.`,
      priority: 'high',
      data: {
        entityType: 'access_request',
        entityId: request._id,
        module: moduleName,
        feature,
        requesterId: req.user._id,
        requesterEmail: req.user.email,
        actionType: 'access_request'
      }
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      message: 'Access request submitted to Super Admin',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending access requests
// @route   GET /api/settings/access-requests/pending
// @access  Private (Super Admin)
exports.getPendingAccessRequests = async (req, res, next) => {
  try {
    if (req.user?.role !== 'super_admin') {
      throw new AppError('Only Super Admin can view pending access requests', 403);
    }

    const requests = await AccessRequest.find({ status: 'pending' })
      .populate('requester', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to an access request
// @route   PATCH /api/settings/access-requests/:id/respond
// @access  Private (Super Admin)
exports.respondToAccessRequest = async (req, res, next) => {
  try {
    if (req.user?.role !== 'super_admin') {
      throw new AppError('Only Super Admin can respond to access requests', 403);
    }

    const decision = String(req.body?.decision || "").trim().toLowerCase();
    const reviewComment = String(req.body?.reviewComment || "").trim();
    if (!['approved', 'rejected'].includes(decision)) {
      throw new AppError('decision must be approved or rejected', 400);
    }

    const request = await AccessRequest.findById(req.params.id);
    if (!request) {
      throw new AppError('Access request not found', 404);
    }
    if (request.status !== 'pending') {
      throw new AppError('This request has already been processed', 409);
    }

    request.status = decision;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewComment = reviewComment;
    await request.save();

    if (decision === 'approved') {
      let settings = await VisualAccessSettings.findOne();
      if (!settings) {
        settings = await VisualAccessSettings.create({
          overrides: [],
          permissionManagers: [],
          assignmentPolicies: DEFAULT_ASSIGNMENT_POLICIES
        });
      }

      const requesterEmail = String(request.requesterEmail || '').toLowerCase();
      const overrides = Array.isArray(settings.overrides) ? settings.overrides : [];
      const targetOverride = overrides.find((entry) => String(entry?.email || '').toLowerCase() === requesterEmail);
      if (targetOverride) {
        const moduleEntry = (targetOverride.modules || []).find((m) => m.module === request.module);
        if (moduleEntry) {
          moduleEntry.restrictedFeatures = (moduleEntry.restrictedFeatures || []).filter(
            (feature) => String(feature || '').toLowerCase() !== request.feature
          );
        }
      }
      settings.updatedBy = req.user._id;
      await settings.save();
    }

    await Notification.create({
      recipient: request.requester,
      type: 'access_request_resolved',
      title: `Access Request ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your ${request.feature} access request for ${request.module} was ${decision}.`,
      priority: decision === 'approved' ? 'medium' : 'high',
      data: {
        entityType: 'access_request',
        entityId: request._id,
        module: request.module,
        feature: request.feature,
        decision
      }
    });

    res.json({
      success: true,
      message: `Access request ${decision}`,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// ============ DATA MANAGEMENT ============

const DATA_ENTITIES = ['beds', 'doctors', 'nurses', 'medicines', 'tests', 'patients', 'patient_history', 'billings'];

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'y'].includes(normalized);
};

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEntity = (entity) => String(entity || '').trim().toLowerCase();

const getTemplateDefinition = (entity) => {
  const templates = {
    beds: ['bedNumber', 'bedType', 'ward', 'floor', 'roomNumber', 'status', 'pricePerDay', 'amenities', 'notes', 'isActive'],
    doctors: ['name', 'email', 'phone', 'specialization', 'department', 'qualification', 'experience', 'consultation_opd', 'consultation_ipd', 'availabilityStatus'],
    nurses: ['firstName', 'lastName', 'email', 'phone', 'role', 'department', 'isActive'],
    medicines: ['name', 'genericName', 'composition', 'category', 'manufacturer', 'batchNumber', 'expiryDate', 'mrp', 'sellingPrice', 'purchasePrice', 'stock', 'reorderLevel', 'unit', 'rackLocation', 'hsnCode', 'gstPercent', 'schedule', 'isActive'],
    tests: ['testName', 'testCode', 'category', 'sampleType', 'price', 'turnaroundTime', 'department', 'description', 'instructions', 'isActive']
  };
  return templates[entity] || [];
};

const buildExportPayload = async (entity) => {
  if (entity === 'beds') {
    const beds = await Bed.find({}).lean();
    const headers = ['bedNumber', 'bedType', 'ward', 'floor', 'roomNumber', 'status', 'pricePerDay', 'isActive', 'notes', 'createdAt', 'updatedAt'];
    const rows = beds.map((b) => ({
      bedNumber: b.bedNumber || '',
      bedType: b.bedType || '',
      ward: b.ward || '',
      floor: b.floor ?? '',
      roomNumber: b.roomNumber || '',
      status: b.status || '',
      pricePerDay: b.pricePerDay ?? 0,
      isActive: b.isActive !== false,
      notes: b.notes || '',
      createdAt: b.createdAt || '',
      updatedAt: b.updatedAt || ''
    }));
    return { headers, rows };
  }

  if (entity === 'doctors') {
    const doctors = await Doctor.find({}).populate('user', 'firstName lastName email phone').lean();
    const headers = ['doctorId', 'name', 'email', 'phone', 'specialization', 'department', 'qualification', 'experience', 'consultation_opd', 'consultation_ipd', 'availabilityStatus', 'createdAt', 'updatedAt'];
    const rows = doctors.map((d) => ({
      doctorId: d.doctorId || '',
      name: d.name || `${d?.user?.firstName || ''} ${d?.user?.lastName || ''}`.trim(),
      email: d.email || d?.user?.email || '',
      phone: d.phone || d?.user?.phone || '',
      specialization: d.specialization || '',
      department: d.department || '',
      qualification: d.qualification || '',
      experience: d.experience ?? 0,
      consultation_opd: d?.consultationFee?.opd ?? 0,
      consultation_ipd: d?.consultationFee?.ipd ?? 0,
      availabilityStatus: d.availabilityStatus || 'available',
      createdAt: d.createdAt || '',
      updatedAt: d.updatedAt || ''
    }));
    return { headers, rows };
  }

  if (entity === 'nurses') {
    const nurses = await User.find({ role: { $in: ['nurse', 'head_nurse'] } }).select('firstName lastName email phone role department isActive createdAt updatedAt').lean();
    const headers = ['firstName', 'lastName', 'email', 'phone', 'role', 'department', 'isActive', 'createdAt', 'updatedAt'];
    const rows = nurses.map((n) => ({
      firstName: n.firstName || '',
      lastName: n.lastName || '',
      email: n.email || '',
      phone: n.phone || '',
      role: n.role || 'nurse',
      department: n.department || '',
      isActive: n.isActive !== false,
      createdAt: n.createdAt || '',
      updatedAt: n.updatedAt || ''
    }));
    return { headers, rows };
  }

  if (entity === 'medicines') {
    const medicines = await Medicine.find({}).lean();
    const headers = ['name', 'genericName', 'composition', 'category', 'manufacturer', 'batchNumber', 'expiryDate', 'mrp', 'sellingPrice', 'purchasePrice', 'stock', 'reorderLevel', 'unit', 'rackLocation', 'hsnCode', 'gstPercent', 'schedule', 'isActive', 'createdAt', 'updatedAt'];
    const rows = medicines.map((m) => ({
      name: m.name || '',
      genericName: m.genericName || '',
      composition: m.composition || '',
      category: m.category || 'tablet',
      manufacturer: m.manufacturer || '',
      batchNumber: m.batchNumber || '',
      expiryDate: m.expiryDate || '',
      mrp: m.mrp ?? 0,
      sellingPrice: m.sellingPrice ?? 0,
      purchasePrice: m.purchasePrice ?? 0,
      stock: m.stock ?? 0,
      reorderLevel: m.reorderLevel ?? 10,
      unit: m.unit || 'pcs',
      rackLocation: m.rackLocation || '',
      hsnCode: m.hsnCode || '',
      gstPercent: m.gstPercent ?? 12,
      schedule: m.schedule || '',
      isActive: m.isActive !== false,
      createdAt: m.createdAt || '',
      updatedAt: m.updatedAt || ''
    }));
    return { headers, rows };
  }

  if (entity === 'tests') {
    const tests = await LabTestCatalog.find({}).lean();
    const headers = ['testName', 'testCode', 'category', 'sampleType', 'price', 'turnaroundTime', 'department', 'description', 'instructions', 'isActive', 'createdAt', 'updatedAt'];
    const rows = tests.map((t) => ({
      testName: t.testName || '',
      testCode: t.testCode || '',
      category: t.category || '',
      sampleType: t.sampleType || '',
      price: t.price ?? 0,
      turnaroundTime: t.turnaroundTime ?? 24,
      department: t.department || '',
      description: t.description || '',
      instructions: t.instructions || '',
      isActive: t.isActive !== false,
      createdAt: t.createdAt || '',
      updatedAt: t.updatedAt || ''
    }));
    return { headers, rows };
  }

  if (entity === 'patients') {
    const patients = await Patient.find({}).select('patientId firstName lastName email phone dateOfBirth gender bloodGroup address status registrationType admissionStatus createdAt updatedAt').lean();
    const headers = ['patientId', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'bloodGroup', 'address', 'status', 'registrationType', 'admissionStatus', 'createdAt', 'updatedAt'];
    const rows = patients.map((p) => ({
      patientId: p.patientId || '',
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      email: p.email || '',
      phone: p.phone || '',
      dateOfBirth: p.dateOfBirth || '',
      gender: p.gender || '',
      bloodGroup: p.bloodGroup || '',
      address: p.address || '',
      status: p.status || '',
      registrationType: p.registrationType || '',
      admissionStatus: p.admissionStatus || '',
      createdAt: p.createdAt || '',
      updatedAt: p.updatedAt || ''
    }));
    return { headers, rows };
  }

  if (entity === 'patient_history') {
    const patients = await Patient.find({}).select('patientId firstName lastName medicalHistory allergies currentMedications createdAt updatedAt').lean();
    const headers = ['patientId', 'patientName', 'medicalHistory', 'allergies', 'currentMedications', 'createdAt', 'updatedAt'];
    const rows = patients.map((p) => ({
      patientId: p.patientId || '',
      patientName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      medicalHistory: JSON.stringify(p.medicalHistory || []),
      allergies: JSON.stringify(p.allergies || []),
      currentMedications: JSON.stringify(p.currentMedications || []),
      createdAt: p.createdAt || '',
      updatedAt: p.updatedAt || ''
    }));
    return { headers, rows };
  }

  if (entity === 'billings') {
    const invoices = await Invoice.find({}).populate('patient', 'patientId firstName lastName').lean();
    const headers = ['invoiceNumber', 'patientId', 'patientName', 'type', 'totalAmount', 'paidAmount', 'dueAmount', 'status', 'dueDate', 'createdAt', 'updatedAt'];
    const rows = invoices.map((i) => ({
      invoiceNumber: i.invoiceNumber || '',
      patientId: i?.patient?.patientId || '',
      patientName: `${i?.patient?.firstName || ''} ${i?.patient?.lastName || ''}`.trim(),
      type: i.type || '',
      totalAmount: i.totalAmount ?? 0,
      paidAmount: i.paidAmount ?? 0,
      dueAmount: i.dueAmount ?? 0,
      status: i.status || '',
      dueDate: i.dueDate || '',
      createdAt: i.createdAt || '',
      updatedAt: i.updatedAt || ''
    }));
    return { headers, rows };
  }

  throw new AppError('Unsupported entity for export', 400);
};

const importRowsForEntity = async (entity, rows = []) => {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx] || {};
    try {
      if (entity === 'beds') {
        const bedNumber = String(row.bedNumber || '').trim();
        if (!bedNumber) { result.skipped += 1; continue; }
        const payload = {
          bedNumber,
          bedType: String(row.bedType || 'general').trim().toLowerCase(),
          ward: String(row.ward || 'General').trim(),
          floor: toNum(row.floor, 1),
          roomNumber: String(row.roomNumber || '').trim() || undefined,
          status: String(row.status || 'available').trim().toLowerCase(),
          pricePerDay: toNum(row.pricePerDay, 0),
          amenities: String(row.amenities || '').split(',').map((x) => x.trim()).filter(Boolean),
          notes: String(row.notes || '').trim() || undefined,
          isActive: toBool(row.isActive, true)
        };
        const existing = await Bed.findOne({ bedNumber });
        if (existing) {
          await Bed.findByIdAndUpdate(existing._id, payload, { runValidators: true });
          result.updated += 1;
        } else {
          await Bed.create(payload);
          result.created += 1;
        }
        continue;
      }

      if (entity === 'doctors') {
        const email = String(row.email || '').trim().toLowerCase();
        const name = String(row.name || '').trim();
        if (!email && !name) { result.skipped += 1; continue; }
        const payload = {
          name: name || 'Doctor',
          email,
          phone: String(row.phone || '').trim(),
          specialization: String(row.specialization || 'General').trim(),
          department: String(row.department || 'General Medicine').trim(),
          qualification: String(row.qualification || 'MBBS').trim(),
          experience: toNum(row.experience, 0),
          consultationFee: {
            opd: toNum(row.consultation_opd, 500),
            ipd: toNum(row.consultation_ipd, toNum(row.consultation_opd, 500) * 2)
          },
          availabilityStatus: String(row.availabilityStatus || 'available').trim()
        };
        const existing = email ? await Doctor.findOne({ email }) : await Doctor.findOne({ name: payload.name });
        if (existing) {
          await Doctor.findByIdAndUpdate(existing._id, payload, { runValidators: true });
          result.updated += 1;
        } else {
          await Doctor.create(payload);
          result.created += 1;
        }
        continue;
      }

      if (entity === 'nurses') {
        const email = String(row.email || '').trim().toLowerCase();
        if (!email) { result.skipped += 1; continue; }
        const payload = {
          firstName: String(row.firstName || 'Nurse').trim(),
          lastName: String(row.lastName || '').trim() || 'User',
          email,
          phone: String(row.phone || '').trim() || undefined,
          role: String(row.role || 'nurse').trim().toLowerCase() === 'head_nurse' ? 'head_nurse' : 'nurse',
          department: String(row.department || '').trim() || undefined,
          isActive: toBool(row.isActive, true)
        };
        const existing = await User.findOne({ email });
        if (existing) {
          await User.findByIdAndUpdate(existing._id, payload, { runValidators: true });
          result.updated += 1;
        } else {
          await User.create({
            ...payload,
            password: 'ChangeMe@123'
          });
          result.created += 1;
        }
        continue;
      }

      if (entity === 'medicines') {
        const name = String(row.name || '').trim();
        if (!name) { result.skipped += 1; continue; }
        const payload = {
          name,
          genericName: String(row.genericName || '').trim() || undefined,
          composition: String(row.composition || '').trim() || undefined,
          category: String(row.category || 'tablet').trim().toLowerCase(),
          manufacturer: String(row.manufacturer || '').trim() || undefined,
          batchNumber: String(row.batchNumber || '').trim() || undefined,
          expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
          mrp: toNum(row.mrp, 0),
          sellingPrice: toNum(row.sellingPrice, 0),
          purchasePrice: toNum(row.purchasePrice, 0),
          stock: toNum(row.stock, 0),
          reorderLevel: toNum(row.reorderLevel, 10),
          unit: String(row.unit || 'pcs').trim(),
          rackLocation: String(row.rackLocation || '').trim() || undefined,
          hsnCode: String(row.hsnCode || '').trim() || undefined,
          gstPercent: toNum(row.gstPercent, 12),
          schedule: String(row.schedule || '').trim(),
          isActive: toBool(row.isActive, true)
        };
        const existing = await Medicine.findOne({ name: payload.name, batchNumber: payload.batchNumber || null });
        if (existing) {
          await Medicine.findByIdAndUpdate(existing._id, payload, { runValidators: true });
          result.updated += 1;
        } else {
          await Medicine.create(payload);
          result.created += 1;
        }
        continue;
      }

      if (entity === 'tests') {
        const testCode = String(row.testCode || '').trim().toUpperCase();
        const testName = String(row.testName || '').trim();
        if (!testCode || !testName) { result.skipped += 1; continue; }
        const payload = {
          testName,
          testCode,
          category: String(row.category || 'pathology').trim().toLowerCase(),
          sampleType: String(row.sampleType || 'blood').trim().toLowerCase(),
          price: toNum(row.price, 0),
          turnaroundTime: toNum(row.turnaroundTime, 24),
          department: String(row.department || '').trim() || undefined,
          description: String(row.description || '').trim() || undefined,
          instructions: String(row.instructions || '').trim() || undefined,
          isActive: toBool(row.isActive, true)
        };
        const existing = await LabTestCatalog.findOne({ testCode });
        if (existing) {
          await LabTestCatalog.findByIdAndUpdate(existing._id, payload, { runValidators: true });
          result.updated += 1;
        } else {
          await LabTestCatalog.create(payload);
          result.created += 1;
        }
        continue;
      }

      result.skipped += 1;
    } catch (error) {
      result.errors.push({ row: idx + 1, message: error.message });
    }
  }

  return result;
};

// @desc    Get data management settings
// @route   GET /api/settings/data-management
// @access  Private (Super Admin)
exports.getDataManagementSettings = async (req, res, next) => {
  try {
    let settings = await DataManagementSettings.findOne();
    if (!settings) {
      settings = await DataManagementSettings.create({
        autoExport: { enabled: false, frequency: 'weekly', time: '02:00', dayOfWeek: 0, dayOfMonth: 1, format: 'csv', entities: ['beds', 'doctors', 'nurses', 'medicines', 'tests'] }
      });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update data management settings
// @route   PUT /api/settings/data-management
// @access  Private (Super Admin)
exports.updateDataManagementSettings = async (req, res, next) => {
  try {
    const incoming = req.body || {};
    const autoExport = incoming.autoExport || {};
    const entities = Array.isArray(autoExport.entities)
      ? autoExport.entities.map(normalizeEntity).filter((entity) => DATA_ENTITIES.includes(entity))
      : [];
    const payload = {
      autoExport: {
        enabled: !!autoExport.enabled,
        frequency: ['daily', 'weekly', 'monthly'].includes(autoExport.frequency) ? autoExport.frequency : 'weekly',
        time: String(autoExport.time || '02:00'),
        dayOfWeek: Math.min(6, Math.max(0, toNum(autoExport.dayOfWeek, 0))),
        dayOfMonth: Math.min(31, Math.max(1, toNum(autoExport.dayOfMonth, 1))),
        format: ['csv', 'json'].includes(autoExport.format) ? autoExport.format : 'csv',
        entities,
        recipients: Array.isArray(autoExport.recipients)
          ? autoExport.recipients.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean)
          : []
      },
      updatedBy: req.user?._id
    };

    const settings = await DataManagementSettings.findOneAndUpdate({}, payload, { new: true, upsert: true, runValidators: true });
    res.json({ success: true, message: 'Data management settings updated', data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bulk import template
// @route   GET /api/settings/data-management/template
// @access  Private (Super Admin)
exports.getDataImportTemplate = async (req, res, next) => {
  try {
    const entity = normalizeEntity(req.query.entity);
    if (!['beds', 'doctors', 'nurses', 'medicines', 'tests'].includes(entity)) {
      throw new AppError('Unsupported import template entity', 400);
    }
    const headers = getTemplateDefinition(entity);
    res.json({ success: true, data: { entity, headers, sample: [Object.fromEntries(headers.map((h) => [h, '']))] } });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk import master data
// @route   POST /api/settings/data-management/import
// @access  Private (Super Admin)
exports.bulkImportData = async (req, res, next) => {
  try {
    const entity = normalizeEntity(req.body?.entity);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!['beds', 'doctors', 'nurses', 'medicines', 'tests'].includes(entity)) {
      throw new AppError('Unsupported import entity', 400);
    }
    if (!rows.length) {
      throw new AppError('rows array is required', 400);
    }
    const summary = await importRowsForEntity(entity, rows);
    res.json({ success: true, message: `Bulk import completed for ${entity}`, data: { entity, ...summary } });
  } catch (error) {
    next(error);
  }
};

// @desc    Export data
// @route   GET /api/settings/data-management/export
// @access  Private (Super Admin)
exports.exportDataByEntity = async (req, res, next) => {
  try {
    const entity = normalizeEntity(req.query.entity);
    if (!DATA_ENTITIES.includes(entity)) {
      throw new AppError('Unsupported export entity', 400);
    }
    const payload = await buildExportPayload(entity);
    res.json({ success: true, data: { entity, ...payload } });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger auto-export run
// @route   POST /api/settings/data-management/run-auto-export
// @access  Private (Super Admin)
exports.runAutoExportNow = async (req, res, next) => {
  try {
    let settings = await DataManagementSettings.findOne();
    if (!settings) {
      settings = await DataManagementSettings.create({
        autoExport: { enabled: false, frequency: 'weekly', time: '02:00', dayOfWeek: 0, dayOfMonth: 1, format: 'csv', entities: ['beds', 'doctors', 'nurses', 'medicines', 'tests'] }
      });
    }
    const entities = (settings.autoExport?.entities || []).filter((entity) => DATA_ENTITIES.includes(entity));
    const exportSummary = [];
    for (const entity of entities) {
      const payload = await buildExportPayload(entity);
      exportSummary.push({ entity, records: payload.rows.length });
    }
    settings.lastRunAt = new Date();
    settings.lastRunStatus = 'success';
    settings.lastRunMessage = `Exported ${exportSummary.length} dataset(s)`;
    settings.updatedBy = req.user?._id;
    await settings.save();

    res.json({
      success: true,
      message: 'Auto export run completed',
      data: {
        runAt: settings.lastRunAt,
        summary: exportSummary
      }
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
    let dataManagement = null;
    
    // Create defaults if needed
    if (!hospital) hospital = await HospitalSettings.create({});
    if (!security) security = await SecuritySettings.create({});
    if (!notifications) notifications = await NotificationSettings.create({});
    if (!preferences) preferences = await UserPreferences.create({ userId: req.user._id });
    if (!visualAccess) visualAccess = await VisualAccessSettings.create({
      overrides: [],
      permissionManagers: [],
      assignmentPolicies: DEFAULT_ASSIGNMENT_POLICIES
    });
    if (req.user?.role === 'super_admin') {
      dataManagement = await DataManagementSettings.findOne();
      if (!dataManagement) {
        dataManagement = await DataManagementSettings.create({
          autoExport: {
            enabled: false,
            frequency: 'weekly',
            time: '02:00',
            dayOfWeek: 0,
            dayOfMonth: 1,
            format: 'csv',
            entities: ['beds', 'doctors', 'nurses', 'medicines', 'tests']
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        hospital,
        security,
        notifications,
        preferences,
        visualAccess,
        dataManagement
      }
    });
  } catch (error) {
    next(error);
  }
};
