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

// Per-organization monitoring stats
exports.orgStats = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Try to get stats from tenant DB
    let tenantStats = { patients: 0, users: 0, beds: 0, admissions: 0, labTests: 0, invoices: 0 };
    try {
      const conn = getTenantConnection(org.dbName);
      const UserSchema = require('../models/NH_User').schema;
      const TenantUser = conn.models.User || conn.model('User', UserSchema);

      const PatientSchema = require('../models/NH_Patient').schema;
      const TenantPatient = conn.models.Patient || conn.model('Patient', PatientSchema);

      const [userCount, patientCount] = await Promise.all([
        TenantUser.countDocuments(),
        TenantPatient.countDocuments()
      ]);

      tenantStats.users = userCount;
      tenantStats.patients = patientCount;
    } catch (err) {
      console.warn(`Could not fetch tenant stats for ${org.slug}:`, err.message);
    }

    const subscription = await Subscription.findOne({
      organization: org._id,
      status: { $in: ['active', 'trial', 'grace_period'] }
    }).populate('plan', 'name code');

    res.json({
      success: true,
      data: {
        organization: org,
        stats: tenantStats,
        subscription: subscription || null
      }
    });
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
