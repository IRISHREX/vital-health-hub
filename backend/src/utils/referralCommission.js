const ReferrerBase = require('../models/NH_Referrer');
const ReferralCommissionBase = require('../models/NH_ReferralCommission');
const { getModel } = require('../utils/tenantModel');

const referralModels = (req) => ({
  Referrer: getModel(req, 'Referrer', ReferrerBase),
  ReferralCommission: getModel(req, 'ReferralCommission', ReferralCommissionBase),
});

/** Resolve the commission percentage for a referrer + module. */
const resolvePercentage = (referrer, moduleKey) => {
  if (!referrer) return 0;
  const rate = (referrer.commissionRates || []).find((r) => r.module === moduleKey);
  const pct = rate ? Number(rate.percentage) : Number(referrer.defaultPercentage || 0);
  return Number.isFinite(pct) && pct > 0 ? pct : 0;
};

const moduleKeyForInvoice = (invoice) => {
  const type = invoice?.type || 'general';
  if (type === 'other') return 'general';
  return type;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Accrue a referral commission for a fully settled invoice.
 * Idempotent: a unique index on (invoice, referrer) prevents duplicates and any
 * duplicate-key error is swallowed. Never throws into the payment flow.
 */
const accrueCommissionForSettledInvoice = async (req, invoice) => {
  try {
    if (!invoice?.referrer) return null;
    const totalAmount = Number(invoice.totalAmount || 0);
    const paidAmount = Number(invoice.paidAmount || 0);
    if (totalAmount <= 0 || paidAmount < totalAmount) return null;

    const { Referrer, ReferralCommission } = referralModels(req);
    const referrerId = invoice.referrer._id || invoice.referrer;
    const referrer = await Referrer.findById(referrerId);
    if (!referrer || !referrer.isActive) return null;

    const moduleKey = moduleKeyForInvoice(invoice);
    const percentage = Number(invoice.referralPercentage) > 0
      ? Number(invoice.referralPercentage)
      : resolvePercentage(referrer, moduleKey);
    if (percentage <= 0) return null;

    const existing = await ReferralCommission.findOne({ invoice: invoice._id, referrer: referrer._id });
    if (existing) {
      if (existing.status === 'cancelled') {
        existing.status = 'accrued';
        existing.cancelReason = undefined;
        existing.baseAmount = totalAmount;
        existing.percentage = percentage;
        existing.commissionAmount = round2((totalAmount * percentage) / 100);
        existing.accruedAt = new Date();
        await existing.save();
      }
      return existing;
    }

    return await ReferralCommission.create({
      referrer: referrer._id,
      invoice: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      patient: invoice.patient?._id || invoice.patient,
      patientName: invoice.externalPatientInfo?.name || undefined,
      module: moduleKey,
      baseAmount: totalAmount,
      percentage,
      commissionAmount: round2((totalAmount * percentage) / 100),
      status: 'accrued',
      recordedBy: req.user?._id,
    });
  } catch (err) {
    if (err?.code === 11000) return null;
    console.error('Referral commission accrual failed:', err.message);
    return null;
  }
};

/** Cancel an accrued (not yet paid) commission when an invoice is refunded or cancelled. */
const cancelCommissionForInvoice = async (req, invoice, reason = 'Invoice refunded') => {
  try {
    if (!invoice?.referrer) return;
    const { ReferralCommission } = referralModels(req);
    await ReferralCommission.updateMany(
      { invoice: invoice._id, status: { $in: ['accrued', 'approved'] } },
      { $set: { status: 'cancelled', cancelReason: reason } }
    );
  } catch (err) {
    console.error('Referral commission cancellation failed:', err.message);
  }
};

module.exports = {
  referralModels,
  resolvePercentage,
  moduleKeyForInvoice,
  round2,
  accrueCommissionForSettledInvoice,
  cancelCommissionForInvoice,
};
