const SubscriptionPlan = require('../models/GM_SubscriptionPlan');
const Subscription = require('../models/GM_Subscription');
const Organization = require('../models/GM_Organization');
const { AppError } = require('../middleware/errorHandler');

// ─── PLANS ───

exports.listPlans = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';
    const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, data: plans });
  } catch (error) { next(error); }
};

exports.createPlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error) { next(error); }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) throw new AppError('Plan not found', 404);
    res.json({ success: true, data: plan });
  } catch (error) { next(error); }
};

exports.deletePlan = async (req, res, next) => {
  try {
    const activeSubs = await Subscription.countDocuments({ plan: req.params.id, status: { $in: ['active', 'trial'] } });
    if (activeSubs > 0) throw new AppError('Cannot delete plan with active subscriptions', 400);
    await SubscriptionPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) { next(error); }
};

// ─── SUBSCRIPTIONS ───

exports.listSubscriptions = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.organization) filter.organization = req.query.organization;
    if (req.query.status) filter.status = req.query.status;

    const subscriptions = await Subscription.find(filter)
      .populate('organization', 'name slug type status')
      .populate('plan', 'name code priceMonthly priceYearly')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: subscriptions });
  } catch (error) { next(error); }
};

exports.createSubscription = async (req, res, next) => {
  try {
    const { organization, plan, billingCycle, startDate, autoRenew, notes } = req.body;

    const org = await Organization.findById(organization);
    if (!org) throw new AppError('Organization not found', 404);

    const planDoc = await SubscriptionPlan.findById(plan);
    if (!planDoc) throw new AppError('Plan not found', 404);

    const amount = billingCycle === 'yearly' ? planDoc.priceYearly : planDoc.priceMonthly;
    const start = new Date(startDate || Date.now());
    const end = new Date(start);
    if (billingCycle === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }

    // Expire any existing active subscriptions for this org
    await Subscription.updateMany(
      { organization, status: { $in: ['active', 'trial'] } },
      { status: 'expired' }
    );

    const subscription = await Subscription.create({
      organization, plan, billingCycle, amount,
      startDate: start, endDate: end,
      renewalDate: end, autoRenew, notes, status: 'active'
    });

    // Update org's enabled modules to match plan
    org.enabledModules = planDoc.includedModules;
    org.maxUsers = planDoc.maxUsers;
    org.maxBeds = planDoc.maxBeds;
    org.status = 'active';
    await org.save();

    const populated = await subscription.populate(['plan', 'organization']);
    res.status(201).json({ success: true, data: populated });
  } catch (error) { next(error); }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) throw new AppError('Subscription not found', 404);

    sub.payments.push(req.body);
    await sub.save();

    res.json({ success: true, data: sub });
  } catch (error) { next(error); }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!sub) throw new AppError('Subscription not found', 404);
    res.json({ success: true, data: sub, message: 'Subscription cancelled' });
  } catch (error) { next(error); }
};

// Check and expire subscriptions (can be called via cron)
exports.checkExpiredSubscriptions = async (req, res, next) => {
  try {
    const now = new Date();
    
    // Move active subscriptions past end date to grace_period
    const graceResult = await Subscription.updateMany(
      { status: 'active', endDate: { $lt: now } },
      { status: 'grace_period' }
    );

    // Move grace_period subscriptions past grace to expired
    const expiredSubs = await Subscription.find({ status: 'grace_period' });
    let expiredCount = 0;
    for (const sub of expiredSubs) {
      const graceEnd = new Date(sub.endDate);
      graceEnd.setDate(graceEnd.getDate() + sub.gracePeriodDays);
      if (now > graceEnd) {
        sub.status = 'expired';
        await sub.save();
        // Suspend the organization
        await Organization.findByIdAndUpdate(sub.organization, { status: 'suspended', suspendReason: 'Subscription expired' });
        expiredCount++;
      }
    }

    res.json({
      success: true,
      message: `Moved ${graceResult.modifiedCount} to grace period, expired ${expiredCount}`
    });
  } catch (error) { next(error); }
};
