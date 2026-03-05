const Organization = require('../models/GM_Organization');
const Subscription = require('../models/GM_Subscription');
const GrandmasterUser = require('../models/GM_GrandmasterUser');
const { generateDbName, getTenantConnection } = require('../config/tenantManager');
const { AppError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');

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
        { 'adminDetails.email': { $regex: search, $options: 'i' } }
      ];
    }

    const organizations = await Organization.find(filter).sort({ createdAt: -1 });
    
    // Attach active subscription info
    const orgIds = organizations.map(o => o._id);
    const subscriptions = await Subscription.find({
      organization: { $in: orgIds },
      status: { $in: ['active', 'trial', 'grace_period'] }
    }).populate('plan', 'name code');

    const subMap = {};
    subscriptions.forEach(s => { subMap[s.organization.toString()] = s; });

    const result = organizations.map(org => ({
      ...org.toObject(),
      activeSubscription: subMap[org._id.toString()] || null
    }));

    res.json({ success: true, data: result, count: result.length });
  } catch (error) { next(error); }
};

// Get single organization
exports.getById = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) throw new AppError('Organization not found', 404);

    const subscription = await Subscription.findOne({
      organization: org._id,
      status: { $in: ['active', 'trial', 'grace_period'] }
    }).populate('plan');

    res.json({ success: true, data: { ...org.toObject(), activeSubscription: subscription } });
  } catch (error) { next(error); }
};

// Onboard new organization
exports.onboard = async (req, res, next) => {
  try {
    const {
      name, type, address, phone, email, website,
      adminDetails, enabledModules, maxUsers, maxBeds, notes
    } = req.body;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Organization.findOne({ slug });
    if (existing) throw new AppError('Organization with a similar name already exists', 400);

    const dbName = generateDbName(slug);

    const org = await Organization.create({
      name, slug, type, address, phone, email, website,
      adminDetails, enabledModules: enabledModules || ['dashboard', 'patients', 'beds', 'admissions'],
      dbName, maxUsers, maxBeds, notes,
      status: 'onboarding', onboardedAt: new Date()
    });

    // Create the hospital admin user in the tenant database
    try {
      const tenantConn = getTenantConnection(dbName);
      const UserSchema = require('../models/NH_User').schema;
      const TenantUser = tenantConn.models.User || tenantConn.model('User', UserSchema);

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('Admin@123', salt);

      await TenantUser.create({
        email: adminDetails.email,
        password: hashedPassword,
        firstName: adminDetails.firstName,
        lastName: adminDetails.lastName,
        role: 'super_admin',
        phone: adminDetails.phone || '',
        isActive: true
      });
    } catch (tenantErr) {
      console.error('Failed to create tenant admin user:', tenantErr.message);
      // Don't fail the onboarding – admin can be created later
    }

    // Activate the organization
    org.status = 'active';
    await org.save();

    res.status(201).json({ success: true, data: org, message: 'Organization onboarded successfully' });
  } catch (error) { next(error); }
};

// Update organization
exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    delete updates.slug;
    delete updates.dbName; // Never allow changing these

    const org = await Organization.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!org) throw new AppError('Organization not found', 404);
    res.json({ success: true, data: org });
  } catch (error) { next(error); }
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
    res.json({ success: true, data: org, message: 'Modules updated' });
  } catch (error) { next(error); }
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
    res.json({ success: true, data: org, message: 'Organization suspended' });
  } catch (error) { next(error); }
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
    res.json({ success: true, data: org, message: 'Organization reactivated' });
  } catch (error) { next(error); }
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
  } catch (error) { next(error); }
};
