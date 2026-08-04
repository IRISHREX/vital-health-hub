const ReferrerBase = require('../models/NH_Referrer');
const ReferralCommissionBase = require('../models/NH_ReferralCommission');
const InvoiceBase = require('../models/NH_Invoice');
const { getModel } = require('../utils/tenantModel');
const { nextTenantSequence } = require('../utils/tenantSequence');
const { round2 } = require('../utils/referralCommission');

const M = (req) => ({
  Referrer: getModel(req, 'Referrer', ReferrerBase),
  ReferralCommission: getModel(req, 'ReferralCommission', ReferralCommissionBase),
  Invoice: getModel(req, 'Invoice', InvoiceBase),
});

const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- Referrers ----------

const listReferrers = async (req, res) => {
  try {
    const { Referrer } = M(req);
    const { search, type, isActive } = req.query;
    const query = {};
    if (type) query.type = type;
    if (isActive === 'true') query.isActive = true;
    if (isActive === 'false') query.isActive = false;
    if (search) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [{ name: rx }, { phone: rx }, { referrerCode: rx }, { organization: rx }];
    }
    const items = await Referrer.find(query).sort({ createdAt: -1 }).limit(500);
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createReferrer = async (req, res) => {
  try {
    const { Referrer } = M(req);
    if (!req.body?.name) return res.status(400).json({ message: 'Referrer name is required' });
    const referrerCode = await nextTenantSequence(req, 'referrer', 'REF', 5);
    const referrer = await Referrer.create({ ...req.body, referrerCode, createdBy: req.user._id });
    res.status(201).json(referrer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateReferrer = async (req, res) => {
  try {
    const { Referrer } = M(req);
    const referrer = await Referrer.findById(req.params.id);
    if (!referrer) return res.status(404).json({ message: 'Referrer not found' });
    const skip = ['_id', 'referrerCode', 'createdBy', 'createdAt', 'updatedAt'];
    Object.entries(req.body || {}).forEach(([k, v]) => {
      if (!skip.includes(k)) referrer[k] = v;
    });
    referrer.lastUpdatedBy = req.user._id;
    await referrer.save();
    res.json(referrer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteReferrer = async (req, res) => {
  try {
    const { Referrer } = M(req);
    const referrer = await Referrer.findById(req.params.id);
    if (!referrer) return res.status(404).json({ message: 'Referrer not found' });
    referrer.isActive = false;
    referrer.lastUpdatedBy = req.user._id;
    await referrer.save();
    res.json({ success: true, message: 'Referrer deactivated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const getReferrerSummary = async (req, res) => {
  try {
    const { Referrer, ReferralCommission } = M(req);
    const referrer = await Referrer.findById(req.params.id);
    if (!referrer) return res.status(404).json({ message: 'Referrer not found' });
    const commissions = await ReferralCommission.find({ referrer: referrer._id })
      .populate('patient', 'firstName lastName patientId')
      .sort({ accruedAt: -1 })
      .limit(500);
    const sum = (status) => round2(
      commissions.filter((c) => c.status === status).reduce((t, c) => t + Number(c.commissionAmount || 0), 0)
    );
    res.json({
      referrer,
      commissions,
      totals: {
        accrued: sum('accrued'),
        approved: sum('approved'),
        paid: sum('paid'),
        cancelled: sum('cancelled'),
        count: commissions.length,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Commissions ----------

const listCommissions = async (req, res) => {
  try {
    const { ReferralCommission } = M(req);
    const { referrerId, status, module: moduleKey, from, to } = req.query;
    const query = {};
    if (referrerId) query.referrer = referrerId;
    if (status) query.status = status;
    if (moduleKey) query.module = moduleKey;
    if (from || to) {
      query.accruedAt = {};
      if (from) query.accruedAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.accruedAt.$lte = end;
      }
    }
    const items = await ReferralCommission.find(query)
      .populate('referrer', 'name referrerCode type phone')
      .populate('patient', 'firstName lastName patientId')
      .sort({ accruedAt: -1 })
      .limit(1000);
    const totals = items.reduce((acc, c) => {
      acc.commission = round2(acc.commission + Number(c.commissionAmount || 0));
      acc.base = round2(acc.base + Number(c.baseAmount || 0));
      acc[c.status] = round2((acc[c.status] || 0) + Number(c.commissionAmount || 0));
      return acc;
    }, { commission: 0, base: 0 });
    res.json({ items, total: items.length, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const VALID_TRANSITIONS = {
  accrued: ['approved', 'cancelled'],
  approved: ['paid', 'cancelled'],
  paid: [],
  cancelled: ['accrued'],
};

const updateCommissionStatus = async (req, res) => {
  try {
    const { ReferralCommission } = M(req);
    const { status, paymentReference, notes } = req.body || {};
    const commission = await ReferralCommission.findById(req.params.id);
    if (!commission) return res.status(404).json({ message: 'Commission entry not found' });
    if (!status) return res.status(400).json({ message: 'status is required' });
    const allowed = VALID_TRANSITIONS[commission.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${commission.status} to ${status}`,
      });
    }
    commission.status = status;
    if (status === 'paid') {
      commission.paidAt = new Date();
      commission.paymentReference = paymentReference || commission.paymentReference;
    }
    if (status === 'cancelled') commission.cancelReason = notes || 'Cancelled manually';
    if (notes) commission.notes = notes;
    await commission.save();
    res.json(commission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Attach or clear a referrer on an invoice (only while commission is not yet paid). */
const attachReferrerToInvoice = async (req, res) => {
  try {
    const { Invoice, Referrer, ReferralCommission } = M(req);
    const { invoiceId, referrerId, percentage } = req.body || {};
    if (!invoiceId) return res.status(400).json({ message: 'invoiceId is required' });
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const paidCommission = await ReferralCommission.findOne({ invoice: invoice._id, status: 'paid' });
    if (paidCommission) {
      return res.status(400).json({ message: 'A commission for this invoice has already been paid out' });
    }

    if (!referrerId) {
      invoice.referrer = undefined;
      invoice.referralPercentage = undefined;
    } else {
      const referrer = await Referrer.findById(referrerId);
      if (!referrer) return res.status(404).json({ message: 'Referrer not found' });
      if (!referrer.isActive) return res.status(400).json({ message: 'Referrer is inactive' });
      invoice.referrer = referrer._id;
      if (percentage !== undefined && percentage !== null && percentage !== '') {
        const pct = Number(percentage);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
          return res.status(400).json({ message: 'percentage must be between 0 and 100' });
        }
        invoice.referralPercentage = pct;
      }
    }
    invoice.lastUpdatedBy = req.user._id;
    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  listReferrers,
  createReferrer,
  updateReferrer,
  deleteReferrer,
  getReferrerSummary,
  listCommissions,
  updateCommissionStatus,
  attachReferrerToInvoice,
};
