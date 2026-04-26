const Organization = require('../models/GM_Organization');
const Subscription = require('../models/GM_Subscription');
const { getTenantConnection, getActiveTenantCount } = require('../config/tenantManager');

// Platform-wide dashboard stats
exports.platformStats = async (req, res, next) => {
  try {
    const [
      totalOrgs,
      activeOrgs,
      suspendedOrgs,
      onboardingOrgs,
      totalSubs,
      activeSubs,
      expiredSubs
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'active' }),
      Organization.countDocuments({ status: 'suspended' }),
      Organization.countDocuments({ status: 'onboarding' }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: { $in: ['active', 'trial'] } }),
      Subscription.countDocuments({ status: 'expired' })
    ]);

    // Revenue calculation (sum of all payments)
    const revenueAgg = await Subscription.aggregate([
      { $unwind: '$payments' },
      { $group: { _id: null, totalRevenue: { $sum: '$payments.amount' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // Monthly revenue (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyRevenueAgg = await Subscription.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.paidAt': { $gte: startOfMonth } } },
      { $group: { _id: null, monthlyRevenue: { $sum: '$payments.amount' } } }
    ]);
    const monthlyRevenue = monthlyRevenueAgg[0]?.monthlyRevenue || 0;

    // Org type breakdown
    const typeBreakdown = await Organization.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Upcoming renewals (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingRenewals = await Subscription.countDocuments({
      status: { $in: ['active', 'trial'] },
      endDate: { $lte: thirtyDaysFromNow }
    });

    res.json({
      success: true,
      data: {
        organizations: { total: totalOrgs, active: activeOrgs, suspended: suspendedOrgs, onboarding: onboardingOrgs },
        subscriptions: { total: totalSubs, active: activeSubs, expired: expiredSubs },
        revenue: { total: totalRevenue, monthly: monthlyRevenue },
        typeBreakdown: typeBreakdown.reduce((acc, t) => { acc[t._id] = t.count; return acc; }, {}),
        upcomingRenewals,
        activeTenantConnections: getActiveTenantCount()
      }
    });
  } catch (error) { next(error); }
};

// Helper – safely register a tenant model
const tenantModel = (conn, name, file) => {
  if (conn.models[name]) return conn.models[name];
  try {
    const schema = require(`../models/${file}`).schema;
    return conn.model(name, schema);
  } catch (e) { return null; }
};

const safeCount = async (Model, filter = {}) => {
  if (!Model) return 0;
  try { return await Model.countDocuments(filter); } catch { return 0; }
};

// Per-organization monitoring stats (rich snapshot for GM dashboards)
exports.orgStats = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id).select('+dbUri');
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    let tenantStats = {
      patients: 0, users: 0, beds: 0, occupiedBeds: 0,
      admissions: 0, activeAdmissions: 0, doctors: 0,
      appointments: 0, labTests: 0, invoices: 0, todayRevenue: 0
    };

    try {
      const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
      await conn.asPromise();

      const Models = {
        User: tenantModel(conn, 'User', 'NH_User'),
        Patient: tenantModel(conn, 'Patient', 'NH_Patient'),
        Bed: tenantModel(conn, 'Bed', 'NH_Bed'),
        Admission: tenantModel(conn, 'Admission', 'NH_Admission'),
        Doctor: tenantModel(conn, 'Doctor', 'NH_Doctor'),
        Appointment: tenantModel(conn, 'Appointment', 'NH_Appointment'),
        LabTest: tenantModel(conn, 'LabTest', 'NH_LabTest'),
        Invoice: tenantModel(conn, 'Invoice', 'NH_Invoice'),
      };

      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

      const [
        users, patients, beds, occupiedBeds,
        admissions, activeAdmissions, doctors,
        appointments, labTests, invoices
      ] = await Promise.all([
        safeCount(Models.User),
        safeCount(Models.Patient),
        safeCount(Models.Bed),
        safeCount(Models.Bed, { status: 'occupied' }),
        safeCount(Models.Admission),
        safeCount(Models.Admission, { status: 'admitted' }),
        safeCount(Models.Doctor),
        safeCount(Models.Appointment),
        safeCount(Models.LabTest),
        safeCount(Models.Invoice),
      ]);

      let todayRevenue = 0;
      if (Models.Invoice) {
        try {
          const agg = await Models.Invoice.aggregate([
            { $match: { createdAt: { $gte: startOfToday } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$totalAmount', '$amount'] } } } }
          ]);
          todayRevenue = agg[0]?.total || 0;
        } catch { /* ignore */ }
      }

      tenantStats = {
        users, patients, beds, occupiedBeds,
        admissions, activeAdmissions, doctors,
        appointments, labTests, invoices, todayRevenue
      };
    } catch (err) {
      console.warn(`Could not fetch tenant stats for ${org.slug}:`, err.message);
    }

    const subscription = await Subscription.findOne({
      organization: org._id,
      status: { $in: ['active', 'trial', 'grace_period'] }
    }).populate('plan', 'name code');

    res.json({
      success: true,
      data: { organization: org, stats: tenantStats, subscription: subscription || null }
    });
  } catch (error) { next(error); }
};

// All organizations + lightweight per-org stats (for GM dashboard grid)
exports.allOrgStats = async (req, res, next) => {
  try {
    const orgs = await Organization.find().select('+dbUri name slug type status enabledModules dbName').sort({ createdAt: -1 });

    const results = await Promise.all(orgs.map(async (org) => {
      const stats = { patients: 0, users: 0, activeAdmissions: 0, occupiedBeds: 0, beds: 0 };
      try {
        const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
        await conn.asPromise();
        const Patient = tenantModel(conn, 'Patient', 'NH_Patient');
        const User = tenantModel(conn, 'User', 'NH_User');
        const Admission = tenantModel(conn, 'Admission', 'NH_Admission');
        const Bed = tenantModel(conn, 'Bed', 'NH_Bed');
        const [p, u, a, ob, b] = await Promise.all([
          safeCount(Patient), safeCount(User),
          safeCount(Admission, { status: 'admitted' }),
          safeCount(Bed, { status: 'occupied' }), safeCount(Bed),
        ]);
        Object.assign(stats, { patients: p, users: u, activeAdmissions: a, occupiedBeds: ob, beds: b });
      } catch (err) {
        // Tenant DB unreachable – return zeros
      }
      return {
        _id: org._id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        status: org.status,
        enabledModules: org.enabledModules || [],
        stats,
      };
    }));

    res.json({ success: true, data: results });
  } catch (error) { next(error); }
};

// Recent onboarded organizations
exports.recentOnboarded = async (req, res, next) => {
  try {
    const recent = await Organization.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name type status createdAt adminDetails.email');
    res.json({ success: true, data: recent });
  } catch (error) { next(error); }
};
