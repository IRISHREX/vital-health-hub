const ClaimBase = require('../models/NH_ReimbursementClaim');
const PolicyBase = require('../models/NH_ReimbursementPolicy');
const EmployeeBase = require('../models/NH_Employee');
const ExpenseBase = require('../models/NH_Expense');
const NotificationBase = require('../models/NH_Notification');
const UserBase = require('../models/NH_User');
const { getModel } = require('../utils/tenantModel');
const { nextTenantSequence } = require('../utils/tenantSequence');

const { CLAIM_TYPES, CLAIM_STATUSES, APPROVAL_STAGES } = ClaimBase;

const M = (req) => ({
  Claim: getModel(req, 'ReimbursementClaim', ClaimBase),
  Policy: getModel(req, 'ReimbursementPolicy', PolicyBase),
  Employee: getModel(req, 'Employee', EmployeeBase),
  Expense: getModel(req, 'Expense', ExpenseBase),
  Notification: getModel(req, 'Notification', NotificationBase),
  User: getModel(req, 'User', UserBase),
});

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DEFAULT_CHAIN = ['ward_incharge', 'dept_head', 'finance'];

/** Role(s) allowed to act on a given approval stage. */
const STAGE_ROLES = {
  ward_incharge: ['head_nurse', 'hospital_admin', 'super_admin'],
  dept_head: ['hospital_admin', 'super_admin'],
  finance: ['billing_staff', 'hospital_admin', 'super_admin'],
};

const STAGE_STATUS = {
  ward_incharge: 'ward_incharge_approved',
  dept_head: 'dept_head_approved',
  finance: 'finance_approved',
};

// ------------------------- Pure state machine -------------------------

/**
 * Pure. Computes the next { status, currentStage } for a claim given a
 * decision taken at a stage, driven by the policy's approvalChain.
 */
const nextStatus = (claim, { stage, decision, approvalChain = DEFAULT_CHAIN }) => {
  const chain = (approvalChain && approvalChain.length ? approvalChain : DEFAULT_CHAIN);
  const idx = chain.indexOf(stage);

  if (decision === 'rejected') {
    return { status: 'rejected', currentStage: 'done' };
  }
  if (decision === 'returned') {
    return { status: 'draft', currentStage: chain[0] || 'ward_incharge' };
  }
  // approved
  const isLast = idx === -1 || idx === chain.length - 1;
  if (isLast) {
    return { status: STAGE_STATUS[stage] || 'finance_approved', currentStage: 'done' };
  }
  const nextStage = chain[idx + 1];
  return { status: STAGE_STATUS[stage] || 'submitted', currentStage: nextStage };
};

/** Pure. What actions are currently available on a claim. */
const allowedTransitions = (claim, approvalChain = DEFAULT_CHAIN) => {
  if (!claim) return [];
  const actions = [];
  if (claim.status === 'draft') actions.push('submit', 'edit', 'cancel');
  if (['submitted', 'ward_incharge_approved', 'dept_head_approved'].includes(claim.status) && claim.currentStage !== 'done') {
    actions.push('approve', 'reject', 'return');
  }
  if (claim.status === 'finance_approved') actions.push('mark_paid');
  if (!['paid', 'cancelled', 'rejected'].includes(claim.status) && claim.status !== 'draft') actions.push('cancel');
  return actions;
};

/** Pure. Can this user act on the claim's current stage? */
const canActOnStage = (user, claim) => {
  if (!user || !claim) return false;
  const stage = claim.currentStage;
  if (!stage || stage === 'done') return false;
  const roles = STAGE_ROLES[stage] || [];
  return roles.includes(user.role);
};

// ------------------------- Receipt text extraction -------------------------

/**
 * Pure, regex-based. Parses a pasted receipt text block into candidate line
 * items: { description, amount, incurredOn }. Best-effort heuristic parser.
 */
const extractLineItemsFromText = (text) => {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const amountRegex = /(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr)?$/i;
  const dateRegex = /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  const items = [];
  lines.forEach((line) => {
    const amountMatch = line.match(amountRegex);
    if (!amountMatch) return;
    const amount = Number(String(amountMatch[1]).replace(/,/g, ''));
    if (!amount || Number.isNaN(amount)) return;
    let description = line.slice(0, amountMatch.index).trim().replace(/[-:,]+$/, '').trim();
    const dateMatch = line.match(dateRegex);
    let incurredOn = null;
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]);
      if (!Number.isNaN(parsed.getTime())) incurredOn = parsed;
      description = description.replace(dateMatch[1], '').trim().replace(/[-:,]+$/, '').trim();
    }
    if (!description) description = 'Item';
    items.push({ description, amount, incurredOn });
  });
  return items;
};

// ------------------------- helpers -------------------------

const parsePaging = (q) => {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 200);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
};

const dateRange = (from, to) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(`${String(to).slice(0, 10)}T23:59:59.999`);
  return Object.keys(range).length ? range : null;
};

const addAudit = (claim, { action, by, byName, fromStatus, toStatus, note }) => {
  claim.auditTrail.push({ at: new Date(), action, by, byName, fromStatus, toStatus, note });
};

const notify = async (req, { recipientId, type = 'system', title, message, priority = 'medium', link }) => {
  if (!recipientId) return;
  try {
    const { Notification } = M(req);
    await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      priority,
      data: { entityType: 'reimbursement_claim', link },
    });
  } catch (_err) {
    // notification failures must never block claim workflow
  }
};

const notifyRole = async (req, { role, title, message, priority = 'medium', link }) => {
  try {
    const { User } = M(req);
    const users = await User.find({ role, isActive: true }).select('_id');
    await Promise.all(users.map((u) => notify(req, { recipientId: u._id, title, message, priority, link })));
  } catch (_err) {
    // ignore
  }
};

const STAGE_NOTIFY_ROLE = {
  ward_incharge: 'head_nurse',
  dept_head: 'hospital_admin',
  finance: 'billing_staff',
};

const getPolicyFor = async (req, claimType) => {
  const { Policy } = M(req);
  return Policy.findOne({ claimType, isActive: true });
};

// ------------------------- Endpoints -------------------------

const buildQuery = (req, q) => {
  const query = {};
  const range = dateRange(q.from, q.to);
  if (range) query.createdAt = range;
  if (q.status) query.status = q.status;
  if (q.claimType) query.claimType = q.claimType;
  if (q.employee) query.employee = q.employee;
  if (q.mine === 'true' || q.mineOnly === 'true') {
    // resolved after employee lookup, see listClaims
  }
  return query;
};

const listClaims = async (req, res) => {
  try {
    const { Claim, Employee } = M(req);
    const { limit, page, skip } = parsePaging(req.query);
    const query = buildQuery(req, req.query);

    if (req.query.mine === 'true' || req.query.mineOnly === 'true') {
      const myEmployee = await Employee.findOne({ email: req.user.email });
      query.$or = [{ createdBy: req.user._id }, ...(myEmployee ? [{ employee: myEmployee._id }] : [])];
    }
    if (req.query.pendingMyApproval === 'true') {
      const stages = Object.entries(STAGE_ROLES)
        .filter(([, roles]) => roles.includes(req.user.role))
        .map(([stage]) => stage);
      query.currentStage = { $in: stages };
      query.status = { $in: ['submitted', 'ward_incharge_approved', 'dept_head_approved'] };
    }

    const [items, total] = await Promise.all([
      Claim.find(query).populate('employee', 'employeeCode firstName lastName department')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Claim.countDocuments(query),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getClaim = async (req, res) => {
  try {
    const { Claim } = M(req);
    const claim = await Claim.findById(req.params.id).populate('employee', 'employeeCode firstName lastName department staffCategory');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveDraft = async (req, res) => {
  try {
    const { Claim, Employee } = M(req);
    const body = req.body || {};
    if (!body.title?.trim()) return res.status(400).json({ message: 'Title is required' });

    let employee = null;
    if (body.employee) employee = await Employee.findById(body.employee);
    else employee = await Employee.findOne({ email: req.user.email });
    if (!employee) return res.status(400).json({ message: 'Employee record not found for claim' });

    const payload = {
      ...body,
      employee: employee._id,
      employeeCode: employee.employeeCode,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      staffCategory: employee.staffCategory,
      department: employee.department,
      module: employee.module,
      lastUpdatedBy: req.user._id,
    };

    let claim;
    if (req.params.id) {
      claim = await Claim.findById(req.params.id);
      if (!claim) return res.status(404).json({ message: 'Claim not found' });
      if (claim.status !== 'draft') return res.status(400).json({ message: 'Only draft claims can be edited' });
      Object.assign(claim, payload);
      addAudit(claim, { action: 'update', by: req.user._id, byName: req.user.name, fromStatus: 'draft', toStatus: 'draft' });
      await claim.save();
    } else {
      claim = await Claim.create({
        ...payload,
        claimNumber: await nextTenantSequence(req, 'reimbursementClaim', 'RC'),
        currentStage: 'ward_incharge',
        status: 'draft',
        createdBy: req.user._id,
        auditTrail: [{ at: new Date(), action: 'create', by: req.user._id, byName: req.user.name, toStatus: 'draft' }],
      });
    }
    res.status(201).json(claim);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const submitClaim = async (req, res) => {
  try {
    const { Claim } = M(req);
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'draft') return res.status(400).json({ message: 'Only draft claims can be submitted' });
    if (!claim.lineItems.length) return res.status(400).json({ message: 'Add at least one line item before submitting' });

    const policy = await getPolicyFor(req, claim.claimType);
    let chain = DEFAULT_CHAIN;
    if (policy) {
      chain = policy.approvalChain?.length ? policy.approvalChain : DEFAULT_CHAIN;
      if (policy.eligibleStaffCategories?.length && !policy.eligibleStaffCategories.includes(claim.staffCategory)) {
        return res.status(400).json({ message: `Staff category "${claim.staffCategory}" is not eligible for ${claim.claimType} claims` });
      }
      if (policy.perClaimCapAmount > 0 && claim.claimedAmount > policy.perClaimCapAmount) {
        return res.status(400).json({ message: `Claim exceeds per-claim cap of ${policy.perClaimCapAmount}` });
      }
      if (policy.requiresReceiptAbove >= 0) {
        const missing = claim.lineItems.find(
          (li) => Number(li.amount || 0) > policy.requiresReceiptAbove && !li.receiptUrl
        );
        if (missing) {
          return res.status(400).json({ message: `Receipt is required for line items above ${policy.requiresReceiptAbove}` });
        }
      }
      if (policy.annualCapAmount > 0) {
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const utilised = await Claim.aggregate([
          { $match: { employee: claim.employee, claimType: claim.claimType, status: { $in: ['ward_incharge_approved', 'dept_head_approved', 'finance_approved', 'paid'] }, createdAt: { $gte: yearStart } } },
          { $group: { _id: null, total: { $sum: '$claimedAmount' } } },
        ]);
        const used = utilised[0]?.total || 0;
        if (used + claim.claimedAmount > policy.annualCapAmount) {
          return res.status(400).json({ message: `Claim would exceed annual cap of ${policy.annualCapAmount} (used ${round2(used)} so far)` });
        }
      }
      claim.policyCapApplied = true;
    }

    claim.status = 'submitted';
    claim.currentStage = chain[0];
    addAudit(claim, { action: 'submit', by: req.user._id, byName: req.user.name, fromStatus: 'draft', toStatus: 'submitted' });
    await claim.save();

    await notify(req, {
      recipientId: claim.createdBy,
      title: 'Claim submitted',
      message: `Your claim ${claim.claimNumber} for ${claim.claimedAmount} has been submitted for approval.`,
      link: `/hrms/claims/${claim._id}`,
    });
    const role = STAGE_NOTIFY_ROLE[claim.currentStage];
    if (role) {
      await notifyRole(req, {
        role,
        title: 'Claim pending your approval',
        message: `Claim ${claim.claimNumber} (${claim.title}) needs ${claim.currentStage.replace('_', ' ')} approval.`,
        link: `/hrms/claims/${claim._id}`,
      });
    }

    res.json(claim);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const actOnClaim = async (req, res) => {
  try {
    const { Claim } = M(req);
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (!canActOnStage(req.user, claim)) {
      return res.status(403).json({ message: 'You are not authorised to act on this claim stage' });
    }
    const { decision, note, approvedAmount } = req.body || {};
    if (!['approved', 'rejected', 'returned'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be approved, rejected, or returned' });
    }

    const policy = await getPolicyFor(req, claim.claimType);
    const chain = policy?.approvalChain?.length ? policy.approvalChain : DEFAULT_CHAIN;
    const stage = claim.currentStage;
    const fromStatus = claim.status;

    claim.approvals.push({
      stage,
      decision,
      decidedBy: req.user._id,
      decidedByName: req.user.name,
      decidedAt: new Date(),
      note,
      approvedAmount: approvedAmount !== undefined ? Number(approvedAmount) : undefined,
    });

    const { status, currentStage } = nextStatus(claim, { stage, decision, approvalChain: chain });
    claim.status = status;
    claim.currentStage = currentStage;
    if (decision === 'approved' && approvedAmount !== undefined) claim.approvedAmount = Number(approvedAmount);
    if (status === 'finance_approved' && claim.approvedAmount === undefined) claim.approvedAmount = claim.claimedAmount;

    addAudit(claim, { action: `stage_${decision}`, by: req.user._id, byName: req.user.name, fromStatus, toStatus: claim.status, note });
    await claim.save();

    if (decision === 'rejected') {
      await notify(req, { recipientId: claim.createdBy, title: 'Claim rejected', message: `Claim ${claim.claimNumber} was rejected at ${stage.replace('_', ' ')} stage.`, priority: 'high', link: `/hrms/claims/${claim._id}` });
    } else if (decision === 'returned') {
      await notify(req, { recipientId: claim.createdBy, title: 'Claim returned', message: `Claim ${claim.claimNumber} was returned for more information.`, priority: 'high', link: `/hrms/claims/${claim._id}` });
    } else {
      await notify(req, { recipientId: claim.createdBy, title: 'Claim approved', message: `Claim ${claim.claimNumber} was approved at ${stage.replace('_', ' ')} stage.`, link: `/hrms/claims/${claim._id}` });
      const nextRole = STAGE_NOTIFY_ROLE[claim.currentStage];
      if (nextRole && claim.currentStage !== 'done') {
        await notifyRole(req, { role: nextRole, title: 'Claim pending your approval', message: `Claim ${claim.claimNumber} needs ${claim.currentStage.replace('_', ' ')} approval.`, link: `/hrms/claims/${claim._id}` });
      }
    }

    res.json(claim);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const cancelClaim = async (req, res) => {
  try {
    const { Claim } = M(req);
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (['paid', 'cancelled'].includes(claim.status)) return res.status(400).json({ message: 'Claim cannot be cancelled' });
    const fromStatus = claim.status;
    claim.status = 'cancelled';
    addAudit(claim, { action: 'cancel', by: req.user._id, byName: req.user.name, fromStatus, toStatus: 'cancelled', note: req.body?.reason });
    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const markPaid = async (req, res) => {
  try {
    const { Claim, Expense } = M(req);
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'finance_approved') return res.status(400).json({ message: 'Only finance-approved claims can be marked paid' });

    if (claim.expense) {
      return res.json({ claim, message: 'Already paid' });
    }

    const amount = round2(claim.approvedAmount ?? claim.claimedAmount);
    const expense = await Expense.create({
      date: new Date(),
      module: claim.module || 'hr',
      category: 'employee_salary',
      customCategory: undefined,
      description: `Reimbursement - ${claim.title} (${claim.claimNumber})`,
      vendorName: claim.employeeName,
      invoiceReference: claim.claimNumber,
      amount,
      taxAmount: 0,
      paymentMode: req.body?.paymentMode || 'bank_transfer',
      status: 'paid',
      paidAt: new Date(),
      sourceType: 'refund',
      sourceId: claim._id,
      notes: `Auto-posted from reimbursement claim ${claim.claimNumber}`,
      recordedBy: req.user._id,
    });

    claim.status = 'paid';
    claim.currentStage = 'done';
    claim.paidAt = new Date();
    claim.paymentMode = req.body?.paymentMode || claim.paymentMode;
    claim.paymentReference = req.body?.paymentReference;
    claim.expense = expense._id;
    addAudit(claim, { action: 'mark_paid', by: req.user._id, byName: req.user.name, fromStatus: 'finance_approved', toStatus: 'paid' });
    await claim.save();

    await notify(req, { recipientId: claim.createdBy, title: 'Claim paid', message: `Claim ${claim.claimNumber} for ${amount} has been paid.`, link: `/hrms/claims/${claim._id}` });

    res.json(claim);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const extractReceipt = async (req, res) => {
  try {
    const { text } = req.body || {};
    const items = extractLineItemsFromText(text);
    res.json({ items });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ------------------------- Policy CRUD -------------------------

const listPolicies = async (req, res) => {
  try {
    const { Policy } = M(req);
    const policies = await Policy.find().sort({ claimType: 1 });
    res.json({ items: policies });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const upsertPolicy = async (req, res) => {
  try {
    const { Policy } = M(req);
    const { claimType } = req.body || {};
    if (!CLAIM_TYPES.includes(claimType)) return res.status(400).json({ message: 'Invalid claimType' });
    const policy = await Policy.findOneAndUpdate(
      { claimType },
      { ...req.body, lastUpdatedBy: req.user._id, $setOnInsert: { createdBy: req.user._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(policy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deletePolicy = async (req, res) => {
  try {
    const { Policy } = M(req);
    await Policy.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ------------------------- Summary -------------------------

const getSummary = async (req, res) => {
  try {
    const { Claim } = M(req);
    const range = dateRange(req.query.from, req.query.to);
    const match = range ? { createdAt: range } : {};

    const [byStatus, byType, byEmployeeYtd] = await Promise.all([
      Claim.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$claimedAmount' } } }]),
      Claim.aggregate([{ $match: match }, { $group: { _id: '$claimType', count: { $sum: 1 }, amount: { $sum: '$claimedAmount' } } }]),
      Claim.aggregate([
        { $match: { createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }, status: { $in: ['ward_incharge_approved', 'dept_head_approved', 'finance_approved', 'paid'] } } },
        { $group: { _id: { employee: '$employee', claimType: '$claimType' }, employeeName: { $first: '$employeeName' }, total: { $sum: '$claimedAmount' } } },
      ]),
    ]);

    res.json({
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count, amount: round2(s.amount) })),
      byType: byType.map((t) => ({ claimType: t._id, count: t.count, amount: round2(t.amount) })),
      ytdUtilisation: byEmployeeYtd.map((u) => ({
        employee: u._id.employee, claimType: u._id.claimType, employeeName: u.employeeName, total: round2(u.total),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMeta = async (_req, res) => {
  res.json({ claimTypes: CLAIM_TYPES, statuses: CLAIM_STATUSES, stages: APPROVAL_STAGES });
};

module.exports = {
  // pure helpers (exported for tests/reuse)
  nextStatus,
  allowedTransitions,
  canActOnStage,
  extractLineItemsFromText,
  DEFAULT_CHAIN,
  STAGE_ROLES,

  // endpoints
  listClaims,
  getClaim,
  saveDraft,
  submitClaim,
  actOnClaim,
  cancelClaim,
  markPaid,
  extractReceipt,
  listPolicies,
  upsertPolicy,
  deletePolicy,
  getSummary,
  getMeta,
};
