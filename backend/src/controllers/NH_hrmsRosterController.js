const mongoose = require('mongoose');
const ShiftTemplateBase = require('../models/NH_ShiftTemplate');
const RosterAssignmentBase = require('../models/NH_RosterAssignment');
const ShiftSwapRequestBase = require('../models/NH_ShiftSwapRequest');
const EmployeeBase = require('../models/NH_Employee');
const DoctorBase = require('../models/NH_Doctor');
const NotificationBase = require('../models/NH_Notification');
const { getModel } = require('../utils/tenantModel');

const M = (req) => ({
  ShiftTemplate: getModel(req, 'ShiftTemplate', ShiftTemplateBase),
  RosterAssignment: getModel(req, 'RosterAssignment', RosterAssignmentBase),
  ShiftSwapRequest: getModel(req, 'ShiftSwapRequest', ShiftSwapRequestBase),
  Employee: getModel(req, 'Employee', EmployeeBase),
  Doctor: getModel(req, 'Doctor', DoctorBase),
  Notification: getModel(req, 'Notification', NotificationBase),
});

const ADMIN_ROLES = ['hospital_admin', 'super_admin'];
const isAdmin = (user) => ADMIN_ROLES.includes(user?.role);

/** Local calendar day key (YYYY-MM-DD) for a Date/string input. */
const dayKey = (date = new Date()) => {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseHHmm = (value) => {
  const [h, m] = String(value || '0:0').split(':').map((n) => parseInt(n, 10) || 0);
  return { h, m };
};

/** Build the actual planned start/end Date objects for a shift on a given day key. */
const computeShiftWindow = (dateKey, template) => {
  const [y, mo, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const { h: sh, m: sm } = parseHHmm(template.startTime);
  const { h: eh, m: em } = parseHHmm(template.endTime);
  const start = new Date(y, mo - 1, d, sh, sm, 0, 0);
  let end = new Date(y, mo - 1, d, eh, em, 0, 0);
  if (template.crossesMidnight || end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start, end };
};

const hoursBetween = (a, b) => Math.abs(new Date(b) - new Date(a)) / (1000 * 60 * 60);

const addDays = (dateKey, n) => {
  const [y, mo, d] = dateKey.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, d + n);
  return dayKey(dt);
};

// ---------------- Fatigue rules (pure helpers) ----------------

const DEFAULT_MAX_CONSECUTIVE_NIGHTS = 4;
const DEFAULT_MAX_WEEKLY_HOURS = 48;

/**
 * Validate a candidate assignment against the employee's existing assignments.
 * `existing` should be the employee's assignments in a window around the candidate date
 * (at least the surrounding week), excluding the assignment being updated (if any).
 * Returns an array of violation message strings (empty = ok).
 */
const validateFatigueRules = (candidate, existing = [], opts = {}) => {
  const violations = [];
  const maxConsecutiveNights = opts.maxConsecutiveNights ?? DEFAULT_MAX_CONSECUTIVE_NIGHTS;
  const maxWeeklyHours = opts.maxWeeklyHours ?? DEFAULT_MAX_WEEKLY_HOURS;
  const minRestHours = candidate.minRestHoursAfter ?? 11;

  // (a) double-booking on the same date
  const sameDay = existing.filter((a) => a.date === candidate.date);
  if (sameDay.length > 0) {
    violations.push(`Employee already has a shift assigned on ${candidate.date}`);
  }

  // (b) minimum rest hours between consecutive shifts
  const neighbours = existing.filter((a) => a.date === addDays(candidate.date, -1) || a.date === addDays(candidate.date, 1));
  neighbours.forEach((n) => {
    if (!n.plannedStart || !n.plannedEnd || !candidate.plannedStart || !candidate.plannedEnd) return;
    let gapHours;
    if (new Date(n.plannedEnd) <= new Date(candidate.plannedStart)) {
      gapHours = hoursBetween(n.plannedEnd, candidate.plannedStart);
    } else if (new Date(candidate.plannedEnd) <= new Date(n.plannedStart)) {
      gapHours = hoursBetween(candidate.plannedEnd, n.plannedStart);
    } else {
      violations.push('Shift overlaps with an adjacent assignment');
      return;
    }
    if (gapHours < minRestHours) {
      violations.push(`Only ${gapHours.toFixed(1)}h rest before/after adjacent shift (minimum ${minRestHours}h required)`);
    }
  });

  // (c) max consecutive night shifts
  if (candidate.shiftKind === 'night') {
    let streak = 1;
    let cursor = candidate.date;
    while (true) {
      cursor = addDays(cursor, -1);
      const found = existing.find((a) => a.date === cursor && a.shiftKind === 'night');
      if (!found) break;
      streak += 1;
    }
    if (streak > maxConsecutiveNights) {
      violations.push(`Exceeds maximum of ${maxConsecutiveNights} consecutive night shifts`);
    }
  }

  // (d) max weekly hours (7-day trailing window ending on candidate date)
  const windowStart = addDays(candidate.date, -6);
  const weekAssignments = existing.filter((a) => a.date >= windowStart && a.date <= candidate.date && a.plannedStart && a.plannedEnd);
  let weekHours = weekAssignments.reduce((sum, a) => sum + hoursBetween(a.plannedStart, a.plannedEnd), 0);
  if (candidate.plannedStart && candidate.plannedEnd) {
    weekHours += hoursBetween(candidate.plannedStart, candidate.plannedEnd);
  }
  if (weekHours > maxWeeklyHours) {
    violations.push(`Exceeds maximum weekly hours (${weekHours.toFixed(1)}h > ${maxWeeklyHours}h)`);
  }

  return violations;
};

// ---------------- Shift Templates CRUD ----------------

const listShiftTemplates = async (req, res) => {
  try {
    const { ShiftTemplate } = M(req);
    const query = {};
    if (req.query.unit) query.unit = req.query.unit;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    const items = await ShiftTemplate.find(query).sort({ code: 1 });
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createShiftTemplate = async (req, res) => {
  try {
    const { ShiftTemplate } = M(req);
    const body = req.body || {};
    if (!body.code || !body.name || !body.startTime || !body.endTime) {
      return res.status(400).json({ message: 'code, name, startTime and endTime are required' });
    }
    const template = await ShiftTemplate.create(body);
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateShiftTemplate = async (req, res) => {
  try {
    const { ShiftTemplate } = M(req);
    const template = await ShiftTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Shift template not found' });
    Object.assign(template, req.body || {});
    await template.save();
    res.json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteShiftTemplate = async (req, res) => {
  try {
    const { ShiftTemplate } = M(req);
    const template = await ShiftTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Shift template not found' });
    template.isActive = false;
    await template.save();
    res.json({ success: true, message: 'Shift template deactivated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------------- Roster ----------------

const buildRosterQuery = (q) => {
  const query = {};
  if (q.from || q.to) {
    query.date = {};
    if (q.from) query.date.$gte = q.from;
    if (q.to) query.date.$lte = q.to;
  }
  if (q.unit) query.unit = q.unit;
  if (q.employeeId) query.employee = q.employeeId;
  if (q.status) query.status = q.status;
  return query;
};

const listRoster = async (req, res) => {
  try {
    const { RosterAssignment } = M(req);
    const query = buildRosterQuery(req.query);
    const items = await RosterAssignment.find(query)
      .populate('shiftTemplate', 'code name kind startTime endTime unit')
      .sort({ date: 1, employeeName: 1 });
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** Fetch an employee's assignments in a window, optionally excluding one assignment id. */
const employeeWindowAssignments = async (RosterAssignment, employeeId, centerDateKey, excludeId) => {
  const from = addDays(centerDateKey, -10);
  const to = addDays(centerDateKey, 10);
  const query = { employee: employeeId, date: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } };
  if (excludeId) query._id = { $ne: excludeId };
  return RosterAssignment.find(query).lean();
};

/** Create or update a single roster assignment with fatigue validation. */
const upsertAssignment = async (req, res) => {
  try {
    const { RosterAssignment, ShiftTemplate, Employee } = M(req);
    const body = req.body || {};
    const { assignmentId, employeeId, date, shiftTemplateId, dutyType, override, overrideReason, notes } = body;

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    let shiftDoc = null;
    let plannedStart;
    let plannedEnd;
    let shiftCode;
    let shiftKind = body.shiftKind || 'morning';
    let unit = body.unit || 'general_ward';
    let minRestHoursAfter = 11;

    if (shiftTemplateId) {
      shiftDoc = await ShiftTemplate.findById(shiftTemplateId);
      if (!shiftDoc) return res.status(404).json({ message: 'Shift template not found' });
      const window = computeShiftWindow(date, shiftDoc);
      plannedStart = window.start;
      plannedEnd = window.end;
      shiftCode = shiftDoc.code;
      shiftKind = shiftDoc.kind;
      unit = shiftDoc.unit;
      minRestHoursAfter = shiftDoc.minRestHoursAfter ?? 11;
    } else if (body.plannedStart && body.plannedEnd) {
      plannedStart = new Date(body.plannedStart);
      plannedEnd = new Date(body.plannedEnd);
    }

    const candidate = {
      date,
      shiftKind,
      plannedStart,
      plannedEnd,
      minRestHoursAfter,
    };

    const windowAssignments = await employeeWindowAssignments(RosterAssignment, employeeId, date, assignmentId);
    const violations = validateFatigueRules(candidate, windowAssignments);

    if (violations.length > 0 && !override) {
      return res.status(400).json({ message: 'Fatigue rule violation', violations });
    }

    const payload = {
      employee: employee._id,
      employeeCode: employee.employeeCode,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      staffRole: body.staffRole || employee.designation,
      date,
      dateValue: new Date(date),
      shiftTemplate: shiftDoc?._id,
      shiftCode,
      shiftKind,
      unit,
      plannedStart,
      plannedEnd,
      dutyType: dutyType || 'regular',
      status: body.status || 'planned',
      notes: violations.length > 0
        ? `${notes || ''} [override: ${overrideReason || 'admin override'} — bypassed: ${violations.join('; ')}]`.trim()
        : notes,
      createdBy: req.user._id,
    };

    let record;
    if (assignmentId) {
      record = await RosterAssignment.findById(assignmentId);
      if (!record) return res.status(404).json({ message: 'Assignment not found' });
      Object.assign(record, payload);
      await record.save();
    } else {
      record = await RosterAssignment.create(payload);
    }

    res.status(assignmentId ? 200 : 201).json({ assignment: record, violations, overridden: violations.length > 0 && !!override });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Bulk-generate a rotational roster over a date range from templates + employees (round-robin). */
const bulkGenerateRoster = async (req, res) => {
  try {
    const { RosterAssignment, ShiftTemplate, Employee } = M(req);
    const { from, to, employeeIds, shiftTemplateIds, dutyType, override } = req.body || {};
    if (!from || !to || !Array.isArray(employeeIds) || employeeIds.length === 0 || !Array.isArray(shiftTemplateIds) || shiftTemplateIds.length === 0) {
      return res.status(400).json({ message: 'from, to, employeeIds and shiftTemplateIds are required' });
    }

    const employees = await Employee.find({ _id: { $in: employeeIds } });
    const templates = await ShiftTemplate.find({ _id: { $in: shiftTemplateIds } });
    if (templates.length === 0) return res.status(404).json({ message: 'No matching shift templates found' });

    const dates = [];
    let cursor = from;
    while (cursor <= to) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }

    const created = [];
    const skipped = [];

    for (let di = 0; di < dates.length; di += 1) {
      const date = dates[di];
      for (let ei = 0; ei < employees.length; ei += 1) {
        const employee = employees[ei];
        // Round-robin: rotate template offset by date index + employee index.
        const template = templates[(di + ei) % templates.length];
        const window = computeShiftWindow(date, template);
        const candidate = {
          date,
          shiftKind: template.kind,
          plannedStart: window.start,
          plannedEnd: window.end,
          minRestHoursAfter: template.minRestHoursAfter ?? 11,
        };
        const windowAssignments = await employeeWindowAssignments(RosterAssignment, employee._id, date);
        // include already-created-in-this-batch assignments for the same employee
        const batchOnes = created.filter((c) => String(c.employee) === String(employee._id));
        const violations = validateFatigueRules(candidate, [...windowAssignments, ...batchOnes]);
        if (violations.length > 0 && !override) {
          skipped.push({ employeeId: employee._id, employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(), date, violations });
          continue;
        }
        const doc = await RosterAssignment.create({
          employee: employee._id,
          employeeCode: employee.employeeCode,
          employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          staffRole: employee.designation,
          date,
          dateValue: new Date(date),
          shiftTemplate: template._id,
          shiftCode: template.code,
          shiftKind: template.kind,
          unit: template.unit,
          plannedStart: window.start,
          plannedEnd: window.end,
          dutyType: dutyType || 'regular',
          status: 'planned',
          notes: violations.length > 0 ? `[override applied: ${violations.join('; ')}]` : undefined,
          createdBy: req.user._id,
        });
        created.push(doc.toObject ? doc.toObject() : doc);
      }
    }

    res.status(201).json({ createdCount: created.length, skippedCount: skipped.length, skipped });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const publishRoster = async (req, res) => {
  try {
    const { RosterAssignment } = M(req);
    const { from, to, unit, assignmentIds } = req.body || {};
    const query = assignmentIds?.length ? { _id: { $in: assignmentIds } } : buildRosterQuery({ from, to, unit });
    query.status = { $in: ['planned'] };
    const result = await RosterAssignment.updateMany(query, { $set: { status: 'published' } });
    res.json({ success: true, modifiedCount: result.modifiedCount ?? result.nModified ?? 0 });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const cancelAssignment = async (req, res) => {
  try {
    const { RosterAssignment } = M(req);
    const assignment = await RosterAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    assignment.status = 'cancelled';
    if (req.body?.reason) assignment.notes = `${assignment.notes || ''} [cancelled: ${req.body.reason}]`.trim();
    await assignment.save();
    res.json(assignment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------------- Hour rollup (payroll consumption) ----------------

const hourRollup = async (req, res) => {
  try {
    const { RosterAssignment } = M(req);
    const { from, to, employeeId } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from and to are required' });
    const query = { date: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } };
    if (employeeId) query.employee = employeeId;
    const items = await RosterAssignment.find(query).lean();

    const byEmployee = {};
    items.forEach((a) => {
      const key = String(a.employee);
      if (!byEmployee[key]) {
        byEmployee[key] = {
          employee: a.employee,
          employeeCode: a.employeeCode,
          employeeName: a.employeeName,
          regularHours: 0,
          onCallHours: 0,
          standbyHours: 0,
          calloutHours: 0,
        };
      }
      const hrs = a.plannedStart && a.plannedEnd ? hoursBetween(a.plannedStart, a.plannedEnd) : 0;
      const bucket = byEmployee[key];
      if (a.dutyType === 'on_call') bucket.onCallHours += hrs;
      else if (a.dutyType === 'standby') bucket.standbyHours += hrs;
      else if (a.dutyType === 'emergency_callout') bucket.calloutHours += hrs;
      else bucket.regularHours += hrs;
    });

    res.json({ items: Object.values(byEmployee) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- Shift swap workflow ----------------

const nextSwapRequestNumber = async (ShiftSwapRequest) => {
  const count = await ShiftSwapRequest.countDocuments({});
  return `SWP-${String(count + 1).padStart(6, '0')}`;
};

const notify = async (Notification, { recipient, type, title, message, link }) => {
  if (!recipient) return;
  try {
    await Notification.create({
      recipient,
      type: 'schedule_update',
      title,
      message,
      data: { entityType: 'roster_swap', link },
    });
  } catch (e) { /* notification failures should not break the workflow */ }
};

const createSwapRequest = async (req, res) => {
  try {
    const { ShiftSwapRequest, RosterAssignment, Employee, Notification } = M(req);
    const { requesterAssignmentId, counterpartyAssignmentId, reason } = req.body || {};
    const requesterAssignment = await RosterAssignment.findById(requesterAssignmentId);
    const counterpartyAssignment = await RosterAssignment.findById(counterpartyAssignmentId);
    if (!requesterAssignment || !counterpartyAssignment) {
      return res.status(404).json({ message: 'Both assignments must exist' });
    }
    const requestNumber = await nextSwapRequestNumber(ShiftSwapRequest);
    const swap = await ShiftSwapRequest.create({
      requestNumber,
      requester: requesterAssignment.employee,
      requesterAssignment: requesterAssignment._id,
      counterparty: counterpartyAssignment.employee,
      counterpartyAssignment: counterpartyAssignment._id,
      reason,
      status: 'open',
      createdBy: req.user._id,
    });
    const counterpartyEmployee = await Employee.findById(counterpartyAssignment.employee);
    await notify(Notification, {
      recipient: counterpartyEmployee?.user,
      title: 'Shift swap requested',
      message: `A colleague requested to swap shifts with you on ${requesterAssignment.date}.`,
      link: `/hr/roster/swaps/${swap._id}`,
    });
    res.status(201).json(swap);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** The counterparty accepts or declines the peer step. */
const respondToSwap = async (req, res) => {
  try {
    const { ShiftSwapRequest, Employee, Notification } = M(req);
    const { accept } = req.body || {};
    const swap = await ShiftSwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ message: 'Swap request not found' });
    if (swap.status !== 'open') return res.status(400).json({ message: `Cannot respond to a swap in status "${swap.status}"` });

    swap.peerStatus = accept ? 'accepted' : 'declined';
    swap.status = accept ? 'peer_accepted' : 'rejected';
    await swap.save();

    const requesterEmployee = await Employee.findById(swap.requester);
    await notify(Notification, {
      recipient: requesterEmployee?.user,
      title: accept ? 'Shift swap accepted by colleague' : 'Shift swap declined',
      message: accept
        ? 'Your swap partner accepted. Awaiting department head approval.'
        : 'Your swap partner declined the request.',
      link: `/hr/roster/swaps/${swap._id}`,
    });
    res.json(swap);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Department head / admin approves or rejects an already peer-accepted swap. */
const decideSwap = async (req, res) => {
  try {
    const { ShiftSwapRequest, Employee, Notification } = M(req);
    const { approve, note } = req.body || {};
    const swap = await ShiftSwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ message: 'Swap request not found' });
    if (swap.status !== 'peer_accepted') {
      return res.status(400).json({ message: 'Swap must be peer-accepted before head approval' });
    }
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'Only a department head/admin can decide this swap' });

    swap.approvalStatus = approve ? 'approved' : 'rejected';
    swap.status = approve ? 'approved' : 'rejected';
    swap.decidedBy = req.user._id;
    swap.decidedAt = new Date();
    swap.decisionNote = note;
    await swap.save();

    const [requesterEmployee, counterpartyEmployee] = await Promise.all([
      Employee.findById(swap.requester),
      Employee.findById(swap.counterparty),
    ]);
    await Promise.all([
      notify(Notification, {
        recipient: requesterEmployee?.user,
        title: approve ? 'Shift swap approved' : 'Shift swap rejected',
        message: approve ? 'Your swap was approved by the department head.' : `Your swap was rejected. ${note || ''}`.trim(),
        link: `/hr/roster/swaps/${swap._id}`,
      }),
      notify(Notification, {
        recipient: counterpartyEmployee?.user,
        title: approve ? 'Shift swap approved' : 'Shift swap rejected',
        message: approve ? 'The swap you accepted was approved.' : `The swap you accepted was rejected. ${note || ''}`.trim(),
        link: `/hr/roster/swaps/${swap._id}`,
      }),
    ]);
    res.json(swap);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Apply the swap: exchange the two assignments' employee/shift data atomically. */
const applySwap = async (req, res) => {
  const { ShiftSwapRequest, RosterAssignment, Employee, Notification } = M(req);
  const swap = await ShiftSwapRequest.findById(req.params.id);
  if (!swap) return res.status(404).json({ message: 'Swap request not found' });
  if (swap.status !== 'approved') return res.status(400).json({ message: 'Swap must be approved before applying' });

  const swapFields = async (session) => {
    const opts = session ? { session } : {};
    const a = await RosterAssignment.findById(swap.requesterAssignment).session(session || null);
    const b = await RosterAssignment.findById(swap.counterpartyAssignment).session(session || null);
    if (!a || !b) throw new Error('One or both assignments no longer exist');

    const [empA, empB] = await Promise.all([Employee.findById(a.employee), Employee.findById(b.employee)]);

    const aFields = { employee: a.employee, employeeCode: a.employeeCode, employeeName: a.employeeName, staffRole: a.staffRole };
    const bFields = { employee: b.employee, employeeCode: b.employeeCode, employeeName: b.employeeName, staffRole: b.staffRole };

    a.employee = bFields.employee; a.employeeCode = bFields.employeeCode; a.employeeName = bFields.employeeName; a.staffRole = bFields.staffRole;
    b.employee = aFields.employee; b.employeeCode = aFields.employeeCode; b.employeeName = aFields.employeeName; b.staffRole = aFields.staffRole;
    a.status = 'swapped';
    b.status = 'swapped';
    await a.save(opts);
    await b.save(opts);

    swap.status = 'applied';
    await swap.save(opts);
    return { a, b, empA, empB };
  };

  try {
    let result;
    let session;
    try {
      session = await mongoose.startSession();
    } catch (e) {
      session = null;
    }
    if (session) {
      try {
        await session.withTransaction(async () => {
          result = await swapFields(session);
        });
      } catch (txErr) {
        // Fall back gracefully when there is no replica set (transactions unsupported).
        await session.endSession();
        result = await swapFields(null);
        session = null;
      }
      if (session) await session.endSession();
    } else {
      result = await swapFields(null);
    }

    await Promise.all([
      notify(Notification, {
        recipient: result.empA?.user,
        title: 'Shift swap applied',
        message: 'Your shift swap has been applied to the roster.',
        link: `/hr/roster/swaps/${swap._id}`,
      }),
      notify(Notification, {
        recipient: result.empB?.user,
        title: 'Shift swap applied',
        message: 'Your shift swap has been applied to the roster.',
        link: `/hr/roster/swaps/${swap._id}`,
      }),
    ]);

    res.json({ swap, assignments: [result.a, result.b] });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const listSwapRequests = async (req, res) => {
  try {
    const { ShiftSwapRequest } = M(req);
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.employeeId) {
      query.$or = [{ requester: req.query.employeeId }, { counterparty: req.query.employeeId }];
    }
    const items = await ShiftSwapRequest.find(query)
      .populate('requesterAssignment')
      .populate('counterpartyAssignment')
      .sort({ createdAt: -1 });
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- Duty check (used by HIS/appointments) ----------------

/**
 * Is the given employee on duty (published roster) at the instant `at`?
 * Returns { hasRoster, onDuty, assignment } — `hasRoster` tells callers whether
 * roster data exists at all for that day so they can skip enforcement when it doesn't.
 */
const isEmployeeOnDuty = async (req, { employeeId, at }) => {
  const { RosterAssignment } = M(req);
  const when = new Date(at);
  const date = dayKey(when);
  const dayAssignments = await RosterAssignment.find({ employee: employeeId, date, status: 'published' }).lean();
  if (dayAssignments.length === 0) {
    return { hasRoster: false, onDuty: true, assignment: null };
  }
  const match = dayAssignments.find((a) => a.plannedStart && a.plannedEnd && new Date(a.plannedStart) <= when && when <= new Date(a.plannedEnd));
  return { hasRoster: true, onDuty: !!match, assignment: match || null };
};

/** Convenience wrapper: resolve a doctor's linked employee record first. */
const isDoctorOnDuty = async (req, { doctorUserId, employeeId, at }) => {
  if (employeeId) return isEmployeeOnDuty(req, { employeeId, at });
  if (!doctorUserId) return { hasRoster: false, onDuty: true, assignment: null };
  const { Employee } = M(req);
  const employee = await Employee.findOne({ user: doctorUserId });
  if (!employee) return { hasRoster: false, onDuty: true, assignment: null };
  return isEmployeeOnDuty(req, { employeeId: employee._id, at });
};

module.exports = {
  // templates
  listShiftTemplates,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
  // roster
  listRoster,
  upsertAssignment,
  bulkGenerateRoster,
  publishRoster,
  cancelAssignment,
  hourRollup,
  // swaps
  createSwapRequest,
  respondToSwap,
  decideSwap,
  applySwap,
  listSwapRequests,
  // duty checks
  isEmployeeOnDuty,
  isDoctorOnDuty,
  // pure helpers (exported for tests / reuse)
  validateFatigueRules,
  computeShiftWindow,
  dayKey,
};
