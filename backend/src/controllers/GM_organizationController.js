const Organization = require('../models/GM_Organization');
const Subscription = require('../models/GM_Subscription');
const { generateDbName, getTenantConnection } = require('../config/tenantManager');
const { AppError } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/auditLog');

const isValidMongoUri = (value) => /^mongodb(\+srv)?:\/\//i.test(String(value || '').trim());

// List all organizations
exports.list = async (req, res, next) => {
  try {
    const { status, type, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'adminDetails.email': { $regex: search, $options: 'i' } },
      ];
    }

    console.log('📋 Listing organizations with filter:', filter);
    const organizations = await Organization.find(filter).sort({ createdAt: -1 });
    console.log(`✅ Found ${organizations.length} organizations`);

    // Attach active subscription info
    const orgIds = organizations.map((o) => o._id);
    const subscriptions = await Subscription.find({
      organization: { $in: orgIds },
      status: { $in: ['active', 'trial', 'grace_period'] },
    }).populate('plan', 'name code');

    const subMap = {};
    subscriptions.forEach((s) => {
      subMap[s.organization.toString()] = s;
    });

    const result = organizations.map((org) => ({
      ...org.toObject(),
      activeSubscription: subMap[org._id.toString()] || null,
    }));

    console.log(`📤 Returning ${result.length} organizations in response`);
    res.json({ success: true, data: result, count: result.length });
  } catch (error) {
    console.error('❌ Error listing organizations:', error.message);
    next(error);
  }
};

// Get single organization
exports.getById = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) throw new AppError('Organization not found', 404);

    const subscription = await Subscription.findOne({
      organization: org._id,
      status: { $in: ['active', 'trial', 'grace_period'] },
    }).populate('plan');

    res.json({ success: true, data: { ...org.toObject(), activeSubscription: subscription } });
  } catch (error) {
    next(error);
  }
};

// Onboard new organization
exports.onboard = async (req, res, next) => {
  try {
    const {
      name,
      type,
      address,
      phone,
      email,
      website,
      adminDetails,
      enabledModules,
      maxUsers,
      maxBeds,
      notes,
      databaseUrl,
      adminPassword,
    } = req.body;

    console.log('🏥 Onboarding organization:', name);

    if (!name || !type || !adminDetails?.email || !adminDetails?.firstName || !adminDetails?.lastName) {
      throw new AppError('Missing required onboarding fields', 400);
    }

    const providedDbUri = String(databaseUrl || '').trim() || null;
    const superAdminPassword = String(adminPassword || '');
    if (providedDbUri && !isValidMongoUri(providedDbUri)) {
      throw new AppError('Invalid database URL. Use a mongodb:// or mongodb+srv:// URI', 400);
    }
    if (!superAdminPassword || superAdminPassword.length < 8) {
      throw new AppError('Super admin password is required and must be at least 8 characters', 400);
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Organization.findOne({ slug });
    if (existing) throw new AppError('Organization with a similar name already exists', 400);

    const dbName = generateDbName(slug);
    console.log('📝 Generated DB name:', dbName);

    const org = await Organization.create({
      name,
      slug,
      type,
      address,
      phone,
      email,
      website,
      adminDetails,
      enabledModules: enabledModules || ['dashboard', 'patients', 'beds', 'admissions'],
      dbName,
      dbUri: providedDbUri,
      maxUsers,
      maxBeds,
      notes,
      status: 'onboarding',
      onboardedAt: new Date(),
    });

    console.log('✅ Organization created:', org._id);

    // Create the hospital admin user in the tenant database.
    // This write guarantees the tenant DB is created during onboarding.
    try {
      const tenantConn = getTenantConnection({ dbName, dbUri: providedDbUri || undefined });
      await tenantConn.asPromise();

      const UserSchema = require('../models/NH_User').schema;
      const TenantUser = tenantConn.models.User || tenantConn.model('User', UserSchema);

      await TenantUser.create({
        email: adminDetails.email,
        // NH_User pre-save hook hashes password.
        password: superAdminPassword,
        firstName: adminDetails.firstName,
        lastName: adminDetails.lastName,
        role: 'super_admin',
        phone: adminDetails.phone || '',
        isActive: true,
      });
      
      console.log('✅ Tenant database and super admin created');
    } catch (tenantErr) {
      console.error('❌ Tenant setup failed:', tenantErr.message);
      await Organization.findByIdAndDelete(org._id);
      throw new AppError(`Database setup failed during onboarding: ${tenantErr.message}`, 400);
    }

    // Activate the organization
    org.status = 'active';
    await org.save();
    console.log('✅ Organization activated:', org._id);

    await logAudit(req, 'onboard_org', { targetOrg: { orgId: org._id, name: org.name, slug: org.slug }, details: { type: org.type, modules: org.enabledModules } });
    res.status(201).json({ success: true, data: org, message: 'Organization onboarded successfully' });
  } catch (error) {
    console.error('❌ Onboarding error:', error.message);
    next(error);
  }
};

// Update organization
exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    delete updates.slug;
    delete updates.dbName;
    delete updates.dbUri; // Never allow changing tenant DB wiring after onboarding

    const org = await Organization.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!org) throw new AppError('Organization not found', 404);
    await logAudit(req, 'update_org', { targetOrg: { orgId: org._id, name: org.name, slug: org.slug }, details: { updatedFields: Object.keys(updates) } });
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

// Update modules for an organization
exports.updateModules = async (req, res, next) => {
  try {
    const { enabledModules } = req.body;
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { enabledModules },
      { new: true, runValidators: true }
    );
    if (!org) throw new AppError('Organization not found', 404);
    await logAudit(req, 'update_org_modules', { targetOrg: { orgId: org._id, name: org.name, slug: org.slug }, details: { enabledModules } });
    res.json({ success: true, data: org, message: 'Modules updated' });
  } catch (error) {
    next(error);
  }
};

// Suspend organization
exports.suspend = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended', suspendedAt: new Date(), suspendReason: reason },
      { new: true }
    );
    if (!org) throw new AppError('Organization not found', 404);
    await logAudit(req, 'suspend_org', { targetOrg: { orgId: org._id, name: org.name, slug: org.slug }, details: { reason } });
    res.json({ success: true, data: org, message: 'Organization suspended' });
  } catch (error) {
    next(error);
  }
};

// Reactivate organization
exports.reactivate = async (req, res, next) => {
  try {
    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { status: 'active', suspendedAt: null, suspendReason: null },
      { new: true }
    );
    if (!org) throw new AppError('Organization not found', 404);
    await logAudit(req, 'reactivate_org', { targetOrg: { orgId: org._id, name: org.name, slug: org.slug } });
    res.json({ success: true, data: org, message: 'Organization reactivated' });
  } catch (error) {
    next(error);
  }
};

// Delete organization
exports.remove = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) throw new AppError('Organization not found', 404);

    // Remove subscriptions
    await Subscription.deleteMany({ organization: org._id });
    await org.deleteOne();

    res.json({ success: true, message: 'Organization removed' });
  } catch (error) {
    next(error);
  }
};
