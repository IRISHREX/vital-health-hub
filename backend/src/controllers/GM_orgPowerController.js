const Organization = require('../models/GM_Organization');
const { getTenantConnection } = require('../config/tenantManager');
const { AppError } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/auditLog');

// Helper to build targetOrg object
const orgTarget = (org) => ({ orgId: org._id, name: org.name, slug: org.slug });

// ─── Settings Control ───

exports.getSettingsConfig = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) throw new AppError('Organization not found', 404);
    res.json({
      success: true,
      data: {
        allowedSettingsTabs: org.allowedSettingsTabs,
        paymentConfig: org.paymentConfig || {},
      },
    });
  } catch (error) { next(error); }
};

exports.updateSettingsTabs = async (req, res, next) => {
  try {
    const { allowedSettingsTabs } = req.body;
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { allowedSettingsTabs },
      { new: true, runValidators: true }
    );
    if (!org) throw new AppError('Organization not found', 404);

    await logAudit(req, 'update_settings_tabs', {
      targetOrg: orgTarget(org),
      details: { allowedSettingsTabs },
    });

    res.json({ success: true, data: org, message: 'Settings tabs updated' });
  } catch (error) { next(error); }
};

// ─── Payment Config ───

exports.updatePaymentConfig = async (req, res, next) => {
  try {
    const { module, config } = req.body;
    if (!module || !config) throw new AppError('Module and config are required', 400);

    const org = await Organization.findById(req.params.id);
    if (!org) throw new AppError('Organization not found', 404);

    if (!org.paymentConfig) org.paymentConfig = new Map();
    org.paymentConfig.set(module, config);
    await org.save();

    await logAudit(req, 'update_payment_config', {
      targetOrg: orgTarget(org),
      details: { module, config },
    });

    res.json({ success: true, data: org, message: 'Payment config updated' });
  } catch (error) { next(error); }
};

exports.updateBulkPaymentConfig = async (req, res, next) => {
  try {
    const { paymentConfig } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org) throw new AppError('Organization not found', 404);

    org.paymentConfig = new Map(Object.entries(paymentConfig));
    await org.save();

    await logAudit(req, 'update_payment_config', {
      targetOrg: orgTarget(org),
      details: { modules: Object.keys(paymentConfig) },
    });

    res.json({ success: true, data: org, message: 'Payment config updated' });
  } catch (error) { next(error); }
};

// ─── Impersonation Token ───

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config');

exports.getImpersonationToken = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id).select('+dbUri');
    if (!org) throw new AppError('Organization not found', 404);

    const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
    await conn.asPromise();

    const UserSchema = require('../models/NH_User').schema;
    const TenantUser = conn.models.User || conn.model('User', UserSchema);

    const adminUser = await TenantUser.findOne({ role: 'super_admin', isActive: true });
    if (!adminUser) throw new AppError('No active super admin found for this organization', 404);

    const token = jwt.sign(
      { id: adminUser._id, role: adminUser.role, orgSlug: org.slug, impersonated: true, gmUserId: req.user._id },
      jwtConfig.jwt.secret,
      { expiresIn: '2h' }
    );

    await logAudit(req, 'impersonate_org', {
      targetOrg: orgTarget(org),
      details: { impersonatedUserId: adminUser._id, impersonatedRole: adminUser.role },
    });

    res.json({
      success: true,
      data: {
        token,
        orgSlug: org.slug,
        user: {
          _id: adminUser._id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: adminUser.role,
        },
        organization: { name: org.name, type: org.type },
      },
    });
  } catch (error) { next(error); }
};

// ─── Remote CRUD (Proxy into tenant DB) ───

const modelMap = {
  patients: 'NH_Patient',
  users: 'NH_User',
  beds: 'NH_Bed',
  admissions: 'NH_Admission',
  doctors: 'NH_Doctor',
  appointments: 'NH_Appointment',
  invoices: 'NH_Invoice',
  labtests: 'NH_LabTest',
  vitals: 'NH_Vital',
  tasks: 'NH_Task',
  notifications: 'NH_Notification',
};

const getTenantModel = (conn, resource) => {
  const modelFile = modelMap[resource];
  if (!modelFile) return null;

  const modelName = modelFile.replace('NH_', '');
  if (conn.models[modelName]) return conn.models[modelName];

  try {
    const schema = require(`../models/${modelFile}`).schema;
    return conn.model(modelName, schema);
  } catch (e) {
    return null;
  }
};

exports.proxyList = async (req, res, next) => {
  try {
    const { id, resource } = req.params;
    const org = await Organization.findById(id).select('+dbUri');
    if (!org) throw new AppError('Organization not found', 404);

    const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
    await conn.asPromise();

    const Model = getTenantModel(conn, resource);
    if (!Model) throw new AppError(`Unknown resource: ${resource}`, 400);

    const { page = 1, limit = 50, search, sort = '-createdAt' } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      Model.find(filter).sort(sort).skip((page - 1) * limit).limit(Number(limit)),
      Model.countDocuments(filter),
    ]);

    res.json({ success: true, data, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) { next(error); }
};

exports.proxyGetById = async (req, res, next) => {
  try {
    const { id, resource, recordId } = req.params;
    const org = await Organization.findById(id).select('+dbUri');
    if (!org) throw new AppError('Organization not found', 404);

    const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
    await conn.asPromise();

    const Model = getTenantModel(conn, resource);
    if (!Model) throw new AppError(`Unknown resource: ${resource}`, 400);

    const record = await Model.findById(recordId);
    if (!record) throw new AppError('Record not found', 404);
    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};

exports.proxyCreate = async (req, res, next) => {
  try {
    const { id, resource } = req.params;
    const org = await Organization.findById(id).select('+dbUri');
    if (!org) throw new AppError('Organization not found', 404);

    const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
    await conn.asPromise();

    const Model = getTenantModel(conn, resource);
    if (!Model) throw new AppError(`Unknown resource: ${resource}`, 400);

    const record = await Model.create(req.body);

    await logAudit(req, 'proxy_create', {
      targetOrg: orgTarget(org),
      details: { resource, recordId: record._id },
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) { next(error); }
};

exports.proxyUpdate = async (req, res, next) => {
  try {
    const { id, resource, recordId } = req.params;
    const org = await Organization.findById(id).select('+dbUri');
    if (!org) throw new AppError('Organization not found', 404);

    const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
    await conn.asPromise();

    const Model = getTenantModel(conn, resource);
    if (!Model) throw new AppError(`Unknown resource: ${resource}`, 400);

    const record = await Model.findByIdAndUpdate(recordId, req.body, { new: true, runValidators: true });
    if (!record) throw new AppError('Record not found', 404);

    await logAudit(req, 'proxy_update', {
      targetOrg: orgTarget(org),
      details: { resource, recordId, updatedFields: Object.keys(req.body) },
    });

    res.json({ success: true, data: record });
  } catch (error) { next(error); }
};

exports.proxyDelete = async (req, res, next) => {
  try {
    const { id, resource, recordId } = req.params;
    const org = await Organization.findById(id).select('+dbUri');
    if (!org) throw new AppError('Organization not found', 404);

    const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
    await conn.asPromise();

    const Model = getTenantModel(conn, resource);
    if (!Model) throw new AppError(`Unknown resource: ${resource}`, 400);

    const record = await Model.findByIdAndDelete(recordId);
    if (!record) throw new AppError('Record not found', 404);

    await logAudit(req, 'proxy_delete', {
      targetOrg: orgTarget(org),
      details: { resource, recordId, deletedRecord: { name: record.name || record.firstName || record.email || recordId } },
    });

    res.json({ success: true, message: 'Record deleted' });
  } catch (error) { next(error); }
};
