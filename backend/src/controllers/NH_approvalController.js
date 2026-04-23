const BaseApprovalRule = require('../models/NH_ApprovalRule');
const BaseApprovalRequest = require('../models/NH_ApprovalRequest');
const BaseUser = require('../models/NH_User');
const BaseNotification = require('../models/NH_Notification');
const { getModel } = require('../utils/tenantModel');
const { sendCustomEmail } = require('../config/email');

const getModels = (req) => ({
  ApprovalRule: getModel(req, 'ApprovalRule', BaseApprovalRule),
  ApprovalRequest: getModel(req, 'ApprovalRequest', BaseApprovalRequest),
  User: getModel(req, 'User', BaseUser),
  Notification: getModel(req, 'Notification', BaseNotification),
});

const isAdmin = (role) => ['super_admin', 'hospital_admin'].includes(role);

// ========== RULES (admin) ==========
exports.listRules = async (req, res, next) => {
  try {
    const { ApprovalRule } = getModels(req);
    const { module, action } = req.query;
    const q = {};
    if (module) q.module = module;
    if (action) q.action = action;
    const rules = await ApprovalRule.find(q).sort({ module: 1, action: 1, name: 1 });
    res.json({ success: true, data: rules });
  } catch (err) { next(err); }
};

exports.createRule = async (req, res, next) => {
  try {
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { ApprovalRule } = getModels(req);
    const rule = await ApprovalRule.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: rule });
  } catch (err) { next(err); }
};

exports.updateRule = async (req, res, next) => {
  try {
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { ApprovalRule } = getModels(req);
    const rule = await ApprovalRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (err) { next(err); }
};

exports.deleteRule = async (req, res, next) => {
  try {
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { ApprovalRule } = getModels(req);
    await ApprovalRule.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ========== CHECK (used by frontend gate) ==========
// Returns matching enabled rule (if any) for module+action
exports.findApplicableRule = async (req, res, next) => {
  try {
    const { ApprovalRule } = getModels(req);
    const { module, action } = req.query;
    if (!module || !action) {
      return res.status(400).json({ success: false, message: 'module & action required' });
    }
    const rule = await ApprovalRule.findOne({ module, action, enabled: true });
    res.json({ success: true, data: rule });
  } catch (err) { next(err); }
};

// ========== REQUESTS ==========
exports.createRequest = async (req, res, next) => {
  try {
    const { ApprovalRule, ApprovalRequest, User, Notification } = getModels(req);
    const { ruleId, formData = {}, resourceType = '', resourceId = '' } = req.body;

    const rule = await ApprovalRule.findById(ruleId);
    if (!rule || !rule.enabled) {
      return res.status(404).json({ success: false, message: 'Approval rule not found' });
    }

    // Validate required fields
    for (const field of rule.formFields) {
      if (field.required) {
        const v = formData[field.key];
        if (v === undefined || v === null || v === '') {
          return res.status(400).json({
            success: false,
            message: `Field "${field.label}" is required`
          });
        }
      }
    }

    const dueAt = new Date(Date.now() + (rule.slaHours || 24) * 60 * 60 * 1000);

    const request = await ApprovalRequest.create({
      rule: rule._id,
      ruleName: rule.name,
      module: rule.module,
      action: rule.action,
      actionLabel: rule.actionLabel || '',
      requester: req.user._id,
      requesterEmail: req.user.email,
      requesterName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      formData,
      resourceType,
      resourceId,
      approverType: rule.approverType,
      approverEmail: rule.approverEmail || '',
      approverRole: rule.approverRole || '',
      dueAt,
      blocking: rule.blocking || 'hard'
    });

    // Notify approver(s)
    let approverUsers = [];
    if (rule.approverType === 'email' && rule.approverEmail) {
      const u = await User.findOne({ email: rule.approverEmail.toLowerCase() });
      if (u) approverUsers.push(u);
    } else if (rule.approverType === 'role' && rule.approverRole) {
      approverUsers = await User.find({ role: rule.approverRole, isActive: true });
    }

    const subjectLine = `Approval needed: ${rule.name}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color:#0ea5e9;">Approval Request</h2>
        <p><strong>${request.requesterName || request.requesterEmail}</strong> has requested approval for <strong>${rule.name}</strong>.</p>
        <p><strong>Module:</strong> ${rule.module} &middot; <strong>Action:</strong> ${rule.action}</p>
        <p><strong>Due by:</strong> ${dueAt.toLocaleString()}</p>
        <p>Open the system and visit Settings &rarr; Approvals to respond.</p>
      </div>`;

    for (const u of approverUsers) {
      try {
        await Notification.create({
          recipient: u._id,
          type: 'approval_request',
          priority: 'high',
          title: subjectLine,
          message: `${request.requesterName || request.requesterEmail} requests ${rule.name}`,
          link: '/settings?tab=approvals'
        });
      } catch {}
      if (u.email) {
        sendCustomEmail(u.email, subjectLine, bodyHtml).catch(() => {});
      }
    }
    // Email-only target (non-user)
    if (rule.approverType === 'email' && rule.approverEmail && approverUsers.length === 0) {
      sendCustomEmail(rule.approverEmail, subjectLine, bodyHtml).catch(() => {});
    }

    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
};

// List requests visible to current user (as requester or approver)
exports.listRequests = async (req, res, next) => {
  try {
    const { ApprovalRequest } = getModels(req);
    const { status, scope = 'all' } = req.query;
    const userEmail = String(req.user.email || '').toLowerCase();
    const role = req.user.role;

    const orClauses = [];
    if (scope === 'mine' || scope === 'all') {
      orClauses.push({ requester: req.user._id });
    }
    if (scope === 'inbox' || scope === 'all') {
      orClauses.push({ approverEmail: userEmail });
      orClauses.push({ approverRole: role });
      if (isAdmin(role)) {
        // Admins can see everything in inbox view
        orClauses.push({});
      }
    }

    const q = orClauses.length ? { $or: orClauses } : {};
    if (status) q.status = status;

    const requests = await ApprovalRequest.find(q).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
};

exports.respondToRequest = async (req, res, next) => {
  try {
    const { ApprovalRequest, User, Notification } = getModels(req);
    const { decision, comment = '' } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision' });
    }
    const reqDoc = await ApprovalRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ success: false, message: 'Not found' });
    if (reqDoc.status !== 'pending' && reqDoc.status !== 'escalated') {
      return res.status(400).json({ success: false, message: 'Already processed' });
    }

    // Authorization check
    const userEmail = String(req.user.email || '').toLowerCase();
    const allowed =
      isAdmin(req.user.role) ||
      (reqDoc.approverType === 'email' && reqDoc.approverEmail === userEmail) ||
      (reqDoc.approverType === 'role' && reqDoc.approverRole === req.user.role);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized to respond' });
    }

    reqDoc.status = decision;
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedByEmail = req.user.email;
    reqDoc.reviewedAt = new Date();
    reqDoc.reviewComment = comment;
    await reqDoc.save();

    // Notify requester
    try {
      await Notification.create({
        recipient: reqDoc.requester,
        type: 'approval_response',
        priority: 'high',
        title: `Approval ${decision}: ${reqDoc.ruleName}`,
        message: comment || `Your request was ${decision}`,
        link: '/settings?tab=approvals'
      });
    } catch {}
    if (reqDoc.requesterEmail) {
      sendCustomEmail(
        reqDoc.requesterEmail,
        `Your request was ${decision}`,
        `<p>Your approval request <strong>${reqDoc.ruleName}</strong> was <strong>${decision}</strong>.</p>${comment ? `<p>Comment: ${comment}</p>` : ''}`
      ).catch(() => {});
    }

    res.json({ success: true, data: reqDoc });
  } catch (err) { next(err); }
};

// Cron-style endpoint: escalate overdue requests
exports.escalateOverdue = async (req, res, next) => {
  try {
    const { ApprovalRequest, ApprovalRule, User, Notification } = getModels(req);
    const now = new Date();
    const overdue = await ApprovalRequest.find({
      status: 'pending',
      escalated: false,
      dueAt: { $lt: now }
    }).limit(50);

    let count = 0;
    for (const r of overdue) {
      const rule = await ApprovalRule.findById(r.rule);
      if (!rule) continue;
      const target = rule.escalationEmail || rule.escalationRole;
      if (!target) {
        r.escalated = true;
        r.escalatedAt = now;
        await r.save();
        continue;
      }
      r.escalated = true;
      r.escalatedAt = now;
      r.escalationTo = target;
      r.status = 'escalated';
      await r.save();

      // Notify escalation target
      let escUsers = [];
      if (rule.escalationEmail) {
        const u = await User.findOne({ email: rule.escalationEmail.toLowerCase() });
        if (u) escUsers.push(u);
      } else if (rule.escalationRole) {
        escUsers = await User.find({ role: rule.escalationRole, isActive: true });
      }
      for (const u of escUsers) {
        try {
          await Notification.create({
            recipient: u._id,
            type: 'approval_escalation',
            priority: 'urgent',
            title: `ESCALATED: ${r.ruleName}`,
            message: `Approval overdue from ${r.requesterEmail}`,
            link: '/settings?tab=approvals'
          });
        } catch {}
        if (u.email) {
          sendCustomEmail(
            u.email,
            `[ESCALATED] Approval overdue: ${r.ruleName}`,
            `<p>Approval request from ${r.requesterEmail} is overdue and has been escalated to you.</p>`
          ).catch(() => {});
        }
      }
      count += 1;
    }

    res.json({ success: true, escalated: count });
  } catch (err) { next(err); }
};
