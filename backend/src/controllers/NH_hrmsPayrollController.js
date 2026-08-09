const EmployeeBase = require('../models/NH_Employee');
const AttendanceBase = require('../models/NH_Attendance');
const ExpenseBase = require('../models/NH_Expense');
const UserBase = require('../models/NH_User');
const EmployeePayProfileBase = require('../models/NH_EmployeePayProfile');
const PayrollPolicyBase = require('../models/NH_PayrollPolicy');
const HrmsPayrollRunBase = require('../models/NH_HrmsPayrollRun');
const { getModel } = require('../utils/tenantModel');
const { nextTenantSequence } = require('../utils/tenantSequence');

const M = (req) => ({
  Employee: getModel(req, 'Employee', EmployeeBase),
  Attendance: getModel(req, 'Attendance', AttendanceBase),
  Expense: getModel(req, 'Expense', ExpenseBase),
  User: getModel(req, 'User', UserBase),
  EmployeePayProfile: getModel(req, 'EmployeePayProfile', EmployeePayProfileBase),
  PayrollPolicy: getModel(req, 'PayrollPolicy', PayrollPolicyBase),
  HrmsPayrollRun: getModel(req, 'HrmsPayrollRun', HrmsPayrollRunBase),
});

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pad2 = (n) => String(n).padStart(2, '0');
const periodKey = (year, month) => `${year}-${pad2(month)}`;
const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const parsePaging = (q) => {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 200);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
};

// =====================================================================
// ---------------------------- PURE MATH -----------------------------
// =====================================================================

/** Full monthly gross from a monthlyCTC breakdown. */
const monthlyCTCGross = (ctc = {}) =>
  round2(Number(ctc.basic || 0) + Number(ctc.hra || 0) + Number(ctc.allowances || 0) + Number(ctc.specialAllowance || 0));

/** Base earnings for one payslip depending on pay model. Returns { code, label, amount }[] and a subtotal. */
const baseEarningsFor = (profile = {}, ctx = {}) => {
  const { payableDays = 0, monthDays = 30, workedHours = 0, proceduresCount = 0, procedureBreakdown = [], onDiemDays = 0 } = ctx;
  const mode = profile.payModel || 'fixed_monthly';
  const lines = [];

  if (mode === 'fixed_monthly') {
    const full = monthlyCTCGross(profile.monthlyCTC);
    const factor = monthDays ? payableDays / monthDays : 0;
    const basic = round2(Number(profile.monthlyCTC?.basic || 0) * factor);
    const hra = round2(Number(profile.monthlyCTC?.hra || 0) * factor);
    const allowances = round2(Number(profile.monthlyCTC?.allowances || 0) * factor);
    const special = round2(Number(profile.monthlyCTC?.specialAllowance || 0) * factor);
    if (basic) lines.push({ code: 'BASIC', label: 'Basic Pay', amount: basic });
    if (hra) lines.push({ code: 'HRA', label: 'House Rent Allowance', amount: hra });
    if (allowances) lines.push({ code: 'ALLOW', label: 'Allowances', amount: allowances });
    if (special) lines.push({ code: 'SPL_ALLOW', label: 'Special Allowance', amount: special });
    return { lines, subtotal: round2(basic + hra + allowances + special), fullGross: full };
  }

  if (mode === 'hourly') {
    const amount = round2(Number(profile.hourlyRate || 0) * workedHours);
    lines.push({ code: 'HOURLY', label: `Hourly Pay (${workedHours}h)`, amount });
    return { lines, subtotal: amount, fullGross: amount };
  }

  if (mode === 'per_procedure') {
    let total = 0;
    (procedureBreakdown.length ? procedureBreakdown : []).forEach((p) => {
      const rate = (profile.perProcedureRates || []).find((r) => r.procedure === p.procedure);
      const amount = round2((rate?.amount || 0) * (p.count || 0));
      total += amount;
      if (amount) lines.push({ code: `PROC_${p.procedure}`, label: `${p.procedure} (x${p.count})`, amount });
    });
    return { lines, subtotal: round2(total), fullGross: round2(total) };
  }

  if (mode === 'per_diem_locum') {
    const amount = round2(Number(profile.perDiemRate || 0) * (onDiemDays || payableDays));
    lines.push({ code: 'PER_DIEM', label: `Per-Diem (${onDiemDays || payableDays} day(s))`, amount });
    return { lines, subtotal: amount, fullGross: amount };
  }

  if (mode === 'retainer') {
    const amount = round2(Number(profile.retainerAmount || 0));
    lines.push({ code: 'RETAINER', label: 'Retainer Fee', amount });
    return { lines, subtotal: amount, fullGross: amount };
  }

  return { lines, subtotal: 0, fullGross: 0 };
};

/** Overtime pay: hours beyond policy threshold at profile's multiplier, on an hourly-equivalent rate. */
const overtimePay = (profile = {}, { overtimeHours = 0, hourlyEquivalentRate = 0 } = {}) => {
  if (!overtimeHours) return { amount: 0, line: null };
  const rate = Number(profile.overtimeMultiplier || 1.5) * Number(hourlyEquivalentRate || 0);
  const amount = round2(rate * overtimeHours);
  return { amount, line: amount ? { code: 'OT', label: `Overtime (${overtimeHours}h @ ${profile.overtimeMultiplier || 1.5}x)`, amount } : null };
};

/** Night-shift differential: percentage uplift on hourly-equivalent rate for night hours worked. */
const nightDifferentialPay = (profile = {}, { nightHours = 0, hourlyEquivalentRate = 0 } = {}) => {
  if (!nightHours || !profile.nightDifferentialPercent) return { amount: 0, line: null };
  const amount = round2(hourlyEquivalentRate * nightHours * (Number(profile.nightDifferentialPercent) / 100));
  return { amount, line: amount ? { code: 'NIGHT_DIFF', label: `Night Differential (${nightHours}h)`, amount } : null };
};

/** Hazard pay: flat per shift (present day) amount. */
const hazardPay = (profile = {}, { shiftsWorked = 0 } = {}) => {
  const amount = round2(Number(profile.hazardPayPerShift || 0) * shiftsWorked);
  return { amount, line: amount ? { code: 'HAZARD', label: `Hazard Pay (${shiftsWorked} shift(s))`, amount } : null };
};

/** On-call standby & callout pay. */
const onCallStandbyPay = (profile = {}, { onCallHours = 0, standbyHours = 0, calloutCount = 0 } = {}) => {
  const lines = [];
  const onCall = round2(Number(profile.onCallRatePerHour || 0) * onCallHours);
  if (onCall) lines.push({ code: 'ON_CALL', label: `On-Call (${onCallHours}h)`, amount: onCall });
  const standby = round2(Number(profile.standbyRatePerHour || 0) * standbyHours);
  if (standby) lines.push({ code: 'STANDBY', label: `Standby (${standbyHours}h)`, amount: standby });
  const callout = round2(Number(profile.calloutFlatAmount || 0) * calloutCount);
  if (callout) lines.push({ code: 'CALLOUT', label: `Callouts (x${calloutCount})`, amount: callout });
  return { lines, amount: round2(onCall + standby + callout) };
};

/** Progressive income tax against slabs. Slab.upTo === -1 means "and above" (open ended). Amounts are annualized then monthly-ised. */
const progressiveIncomeTax = (annualTaxableIncome, slabs = []) => {
  if (!Array.isArray(slabs) || !slabs.length) return 0;
  const sorted = [...slabs].sort((a, b) => (a.upTo === -1 ? Infinity : a.upTo) - (b.upTo === -1 ? Infinity : b.upTo));
  let tax = 0;
  let lower = 0;
  for (const slab of sorted) {
    const upper = slab.upTo === -1 ? Infinity : Number(slab.upTo);
    if (annualTaxableIncome <= lower) break;
    const taxableInBand = Math.min(annualTaxableIncome, upper) - lower;
    if (taxableInBand > 0) tax += taxableInBand * (Number(slab.percent) / 100);
    lower = upper;
    if (annualTaxableIncome <= upper) break;
  }
  return round2(tax);
};

/** Statutory deductions for a given earned gross using profile + org policy. */
const statutoryDeductions = (profile = {}, grossEarnings = 0, policy = {}) => {
  const statutory = profile.statutory || {};
  const lines = [];

  const pfWage = Math.min(grossEarnings, Number(policy.pfWageCeiling || Infinity) || Infinity);
  const pf = round2((pfWage * Number(statutory.pfPercent || 0)) / 100);
  if (pf) lines.push({ code: 'PF', label: 'Provident Fund', amount: pf });

  const esiWage = Math.min(grossEarnings, Number(policy.esiWageCeiling || Infinity) || Infinity);
  const esi = round2((esiWage * Number(statutory.esiPercent || 0)) / 100);
  if (esi) lines.push({ code: 'ESI', label: 'ESI', amount: esi });

  const professionalTax = round2(Number(statutory.professionalTax ?? policy.professionalTaxDefault ?? 0));
  if (professionalTax) lines.push({ code: 'PT', label: 'Professional Tax', amount: professionalTax });

  const socialSecurity = round2((grossEarnings * Number(statutory.socialSecurityPercent || 0)) / 100);
  if (socialSecurity) lines.push({ code: 'SS', label: 'Social Security', amount: socialSecurity });

  let incomeTax = 0;
  if (statutory.incomeTaxRegime === 'flat') {
    incomeTax = round2((grossEarnings * Number(statutory.flatTaxPercent || 0)) / 100);
  } else {
    const annualTaxable = Math.max(0, grossEarnings * 12 - pf * 12);
    const annualTax = progressiveIncomeTax(annualTaxable, policy.incomeTaxSlabs || []);
    incomeTax = round2(annualTax / 12);
  }
  if (incomeTax) lines.push({ code: 'TDS', label: 'Income Tax (TDS)', amount: incomeTax });

  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, total };
};

/** Build one full payslip from profile + attendance/roster derived context + org policy. */
const buildPayslipCalc = (profile = {}, employeeMeta = {}, ctx = {}, policy = {}) => {
  const { lines: baseLines, subtotal, fullGross } = baseEarningsFor(profile, ctx);
  const monthDays = ctx.monthDays || 30;
  const hourlyEquivalentRate = ctx.hourlyEquivalentRate
    ?? (profile.payModel === 'hourly' ? Number(profile.hourlyRate || 0) : (monthlyCTCGross(profile.monthlyCTC) / monthDays / 8 || 0));

  const earnings = [...baseLines];
  let earningsTotal = subtotal;

  const ot = overtimePay(profile, { overtimeHours: ctx.overtimeHours, hourlyEquivalentRate });
  if (ot.line) { earnings.push(ot.line); earningsTotal += ot.amount; }

  const nd = nightDifferentialPay(profile, { nightHours: ctx.nightHours, hourlyEquivalentRate });
  if (nd.line) { earnings.push(nd.line); earningsTotal += nd.amount; }

  const hz = hazardPay(profile, { shiftsWorked: ctx.shiftsWorked ?? ctx.presentDays });
  if (hz.line) { earnings.push(hz.line); earningsTotal += hz.amount; }

  const ocs = onCallStandbyPay(profile, {
    onCallHours: ctx.onCallHours, standbyHours: ctx.standbyHours, calloutCount: ctx.calloutCount,
  });
  ocs.lines.forEach((l) => earnings.push(l));
  earningsTotal += ocs.amount;

  if (ctx.bonus) {
    const b = round2(ctx.bonus);
    earnings.push({ code: 'BONUS', label: 'Bonus / Adjustment', amount: b });
    earningsTotal += b;
  }

  earningsTotal = round2(earningsTotal);
  const ded = statutoryDeductions(profile, earningsTotal, policy);
  const deductions = [...ded.lines];
  if (ctx.extraDeduction) {
    const d = round2(ctx.extraDeduction);
    deductions.push({ code: 'ADJ', label: 'Other Deduction', amount: d });
  }
  const totalDeductions = round2(deductions.reduce((s, l) => s + l.amount, 0));
  const netPay = round2(earningsTotal - totalDeductions);

  return {
    employee: employeeMeta._id,
    employeeCode: employeeMeta.employeeCode,
    employeeName: employeeMeta.employeeName,
    staffCategory: employeeMeta.staffCategory,
    designation: employeeMeta.designation,
    payModel: profile.payModel || 'fixed_monthly',
    monthDays,
    presentDays: ctx.presentDays || 0,
    paidLeaveDays: ctx.paidLeaveDays || 0,
    unpaidLeaveDays: ctx.unpaidLeaveDays || 0,
    payableDays: ctx.payableDays || 0,
    regularHours: ctx.regularHours || 0,
    overtimeHours: ctx.overtimeHours || 0,
    nightHours: ctx.nightHours || 0,
    onCallHours: ctx.onCallHours || 0,
    standbyHours: ctx.standbyHours || 0,
    calloutCount: ctx.calloutCount || 0,
    proceduresCount: ctx.proceduresCount || 0,
    earnings,
    deductions,
    grossEarnings: earningsTotal,
    totalDeductions,
    netPay,
    paid: false,
    notes: ctx.notes || '',
  };
};

// =====================================================================
// --------------------------- DB / HTTP  -------------------------------
// =====================================================================

/** Attendance-derived rollup for one employee across a period. */
const attendanceSummary = (records = []) => {
  let presentDays = 0;
  let workedMinutes = 0;
  records.forEach((r) => {
    if (r.status === 'present' || r.status === 'checked_in') presentDays += 1;
    else if (r.status === 'half_day') presentDays += 0.5;
    workedMinutes += Number(r.totalMinutes || 0);
  });
  return { presentDays, workedHours: round2(workedMinutes / 60) };
};

/** Attempt to enrich with roster duty-hour rollups. Degrades gracefully if absent. */
const rosterSummaryFor = async (req, employeeId, monthStart, monthEnd) => {
  const fallback = { overtimeHours: 0, nightHours: 0, onCallHours: 0, standbyHours: 0, calloutCount: 0 };
  try {
    const { rosterAvailabilityFor } = require('../utils/rosterAvailability');
    if (typeof rosterAvailabilityFor === 'function') {
      const data = await rosterAvailabilityFor(req, employeeId, monthStart, monthEnd);
      return { ...fallback, ...(data || {}) };
    }
  } catch { /* util not present, degrade */ }
  try {
    const RosterAssignmentBase = require('../models/NH_RosterAssignment');
    const RosterAssignment = getModel(req, 'RosterAssignment', RosterAssignmentBase);
    const assignments = await RosterAssignment.find({
      employee: employeeId,
      date: { $gte: monthStart, $lte: monthEnd },
    }).lean();
    let overtimeHours = 0, nightHours = 0, onCallHours = 0, standbyHours = 0, calloutCount = 0;
    assignments.forEach((a) => {
      overtimeHours += Number(a.overtimeHours || 0);
      nightHours += Number(a.nightHours || 0);
      onCallHours += Number(a.onCallHours || 0);
      standbyHours += Number(a.standbyHours || 0);
      calloutCount += Number(a.calloutCount || 0);
    });
    return { overtimeHours: round2(overtimeHours), nightHours: round2(nightHours), onCallHours: round2(onCallHours), standbyHours: round2(standbyHours), calloutCount };
  } catch {
    return fallback;
  }
};

const getPolicy = async (req) => {
  const { PayrollPolicy } = M(req);
  let policy = await PayrollPolicy.findOne({ isActive: true }).sort({ createdAt: -1 });
  if (!policy) policy = await PayrollPolicy.create({ createdBy: req.user?._id });
  return policy;
};

// ---------- Pay Profiles ----------

const listPayProfiles = async (req, res) => {
  try {
    const { EmployeePayProfile } = M(req);
    const query = {};
    if (req.query.active === 'true') query.isActive = true;
    const items = await EmployeePayProfile.find(query).populate('employee', 'firstName lastName employeeCode designation department');
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPayProfile = async (req, res) => {
  try {
    const { EmployeePayProfile } = M(req);
    const profile = await EmployeePayProfile.findOne({ employee: req.params.employeeId });
    if (!profile) return res.status(404).json({ message: 'Pay profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const upsertPayProfile = async (req, res) => {
  try {
    const { EmployeePayProfile, Employee } = M(req);
    const employeeId = req.params.employeeId;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    let profile = await EmployeePayProfile.findOne({ employee: employeeId });
    if (profile) {
      Object.assign(profile, req.body, { lastUpdatedBy: req.user._id });
    } else {
      profile = new EmployeePayProfile({ ...req.body, employee: employeeId, createdBy: req.user._id });
    }
    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deletePayProfile = async (req, res) => {
  try {
    const { EmployeePayProfile } = M(req);
    const profile = await EmployeePayProfile.findOne({ employee: req.params.employeeId });
    if (!profile) return res.status(404).json({ message: 'Pay profile not found' });
    profile.isActive = false;
    await profile.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Policy ----------

const getPayrollPolicy = async (req, res) => {
  try {
    const policy = await getPolicy(req);
    res.json(policy);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updatePayrollPolicy = async (req, res) => {
  try {
    const policy = await getPolicy(req);
    Object.entries(req.body || {}).forEach(([key, value]) => {
      if (['_id', 'createdAt', 'updatedAt'].includes(key)) return;
      policy[key] = value;
    });
    policy.lastUpdatedBy = req.user._id;
    await policy.save();
    res.json(policy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Runs ----------

const rollupRun = (run) => {
  run.totals = {
    grossEarnings: round2(run.items.reduce((s, i) => s + Number(i.grossEarnings || 0), 0)),
    totalDeductions: round2(run.items.reduce((s, i) => s + Number(i.totalDeductions || 0), 0)),
    netPay: round2(run.items.reduce((s, i) => s + Number(i.netPay || 0), 0)),
    paidAmount: round2(run.items.filter((i) => i.paid).reduce((s, i) => s + Number(i.netPay || 0), 0)),
    headcount: run.items.length,
  };
  return run;
};

const listRuns = async (req, res) => {
  try {
    const { HrmsPayrollRun } = M(req);
    const query = {};
    if (req.query.year) query.year = Number(req.query.year);
    if (req.query.status) query.status = req.query.status;
    const items = await HrmsPayrollRun.find(query).sort({ period: -1 }).limit(60);
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getRun = async (req, res) => {
  try {
    const { HrmsPayrollRun } = M(req);
    const run = await HrmsPayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const buildRunItems = async (req, { month, year }) => {
  const { Employee, Attendance, EmployeePayProfile } = M(req);
  const monthDays = daysInMonth(year, month);
  const dayPrefix = `${year}-${pad2(month)}`;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, monthDays, 23, 59, 59, 999);
  const policy = await getPolicy(req);

  const [employees, attendance, profiles] = await Promise.all([
    Employee.find({ isActive: true }),
    Attendance.find({ day: new RegExp(`^${dayPrefix}`) }).select('user employee status totalMinutes day'),
    EmployeePayProfile.find({ isActive: true }),
  ]);

  const profileByEmployee = new Map(profiles.map((p) => [String(p.employee), p]));
  const byEmployee = new Map();
  attendance.forEach((r) => {
    const keys = [String(r.employee || ''), String(r.user || '')].filter(Boolean);
    keys.forEach((k) => {
      if (!byEmployee.has(k)) byEmployee.set(k, []);
      byEmployee.get(k).push(r);
    });
  });

  const items = [];
  for (const employee of employees) {
    const profile = profileByEmployee.get(String(employee._id));
    if (!profile) continue; // no pay profile => skip from HRMS payroll run
    const records = byEmployee.get(String(employee._id))
      || (employee.user ? byEmployee.get(String(employee.user)) : null)
      || [];
    const { presentDays, workedHours } = attendanceSummary(records);
    const payableDays = Math.min(monthDays, presentDays);
    const roster = await rosterSummaryFor(req, employee._id, monthStart, monthEnd);
    const employeeMeta = {
      _id: employee._id,
      employeeCode: employee.employeeCode,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      staffCategory: employee.department || employee.module,
      designation: employee.designation,
    };
    const ctx = {
      monthDays,
      presentDays,
      paidLeaveDays: 0,
      unpaidLeaveDays: Math.max(0, monthDays - presentDays),
      payableDays,
      regularHours: workedHours,
      workedHours,
      shiftsWorked: presentDays,
      ...roster,
    };
    items.push(buildPayslipCalc(profile.toObject(), employeeMeta, ctx, policy.toObject()));
  }
  return items;
};

const generateRun = async (req, res) => {
  try {
    const { HrmsPayrollRun } = M(req);
    const month = Number(req.body?.month);
    const year = Number(req.body?.year);
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) and year are required' });
    }
    const period = periodKey(year, month);
    const existing = await HrmsPayrollRun.findOne({ period });
    if (existing && !['draft', 'review'].includes(existing.status)) {
      return res.status(400).json({ message: `Payroll for ${period} is already ${existing.status}` });
    }
    const items = await buildRunItems(req, { month, year });
    const run = existing || new HrmsPayrollRun({
      runNumber: await nextTenantSequence(req, 'hrmsPayrollRun', 'HPR'),
      period, month, year, createdBy: req.user._id,
    });
    run.items = items;
    if (!existing) run.status = 'draft';
    rollupRun(run);
    await run.save();
    res.status(existing ? 200 : 201).json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const recalculateRun = async (req, res) => {
  try {
    const { HrmsPayrollRun } = M(req);
    const run = await HrmsPayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (!['draft', 'review'].includes(run.status)) {
      return res.status(400).json({ message: `Cannot recalculate a ${run.status} run` });
    }
    const items = await buildRunItems(req, { month: run.month, year: run.year });
    // preserve paid flags/manual notes keyed by employee
    const prevByEmp = new Map(run.items.map((i) => [String(i.employee), i]));
    run.items = items.map((i) => {
      const prev = prevByEmp.get(String(i.employee));
      if (prev) return { ...i, paid: prev.paid, paidAt: prev.paidAt, paymentMode: prev.paymentMode, paymentReference: prev.paymentReference, payslipNumber: prev.payslipNumber, notes: prev.notes };
      return i;
    });
    rollupRun(run);
    await run.save();
    res.json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateSlip = async (req, res) => {
  try {
    const { HrmsPayrollRun } = M(req);
    const run = await HrmsPayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (!['draft', 'review'].includes(run.status)) {
      return res.status(400).json({ message: `Cannot edit a ${run.status} run` });
    }
    const slip = run.items.id(req.params.slipId);
    if (!slip) return res.status(404).json({ message: 'Payslip not found' });

    const { bonus, extraDeduction, notes, earnings, deductions } = req.body || {};
    if (Array.isArray(earnings)) slip.earnings = earnings;
    if (Array.isArray(deductions)) slip.deductions = deductions;
    if (bonus) slip.earnings.push({ code: 'BONUS_ADJ', label: 'Bonus / Adjustment', amount: round2(bonus) });
    if (extraDeduction) slip.deductions.push({ code: 'ADJ', label: 'Other Deduction', amount: round2(extraDeduction) });
    if (notes !== undefined) slip.notes = notes;

    slip.grossEarnings = round2(slip.earnings.reduce((s, l) => s + Number(l.amount || 0), 0));
    slip.totalDeductions = round2(slip.deductions.reduce((s, l) => s + Number(l.amount || 0), 0));
    slip.netPay = round2(slip.grossEarnings - slip.totalDeductions);

    rollupRun(run);
    await run.save();
    res.json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const STATUS_TRANSITIONS = {
  draft: ['review', 'cancelled'],
  review: ['draft', 'finalized', 'cancelled'],
  finalized: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

/** Post a consolidated salary expense for a finalized run, idempotently. */
const postSalaryExpense = async (req, run) => {
  const { Expense } = M(req);
  if (run.expensePosted) return;
  const expenseNumber = await nextTenantSequence(req, 'expense', 'EXP');
  const expense = await Expense.create({
    expenseNumber,
    date: new Date(),
    module: 'hr',
    category: 'employee_salary',
    description: `Consolidated salary payout for ${run.period} (${run.runNumber})`,
    amount: run.totals.netPay,
    totalAmount: run.totals.netPay,
    status: 'pending',
    paymentMode: 'bank_transfer',
    sourceType: 'payroll',
    sourceId: run._id,
    recordedBy: req.user._id,
  });
  run.expensePosted = true;
  run.expenseRef = expense._id;
};

const transitionStatus = async (req, res) => {
  try {
    const { HrmsPayrollRun } = M(req);
    const run = await HrmsPayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    const target = req.body?.status;
    const allowed = STATUS_TRANSITIONS[run.status] || [];
    if (!allowed.includes(target)) {
      return res.status(400).json({ message: `Cannot move from ${run.status} to ${target}` });
    }
    run.status = target;
    if (target === 'finalized') {
      run.finalizedAt = new Date();
      run.finalizedBy = req.user._id;
      run.items.forEach((slip, idx) => {
        if (!slip.payslipNumber) slip.payslipNumber = `${run.runNumber}-${String(idx + 1).padStart(3, '0')}`;
      });
      await postSalaryExpense(req, run);
    }
    await run.save();
    res.json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const markSlipPaid = async (req, res) => {
  try {
    const { HrmsPayrollRun } = M(req);
    const run = await HrmsPayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (!['finalized', 'paid'].includes(run.status)) {
      return res.status(400).json({ message: 'Run must be finalized before marking payslips paid' });
    }
    const slip = run.items.id(req.params.slipId);
    if (!slip) return res.status(404).json({ message: 'Payslip not found' });
    slip.paid = true;
    slip.paidAt = new Date();
    slip.paymentMode = req.body?.paymentMode || slip.paymentMode;
    slip.paymentReference = req.body?.paymentReference || slip.paymentReference;
    rollupRun(run);
    if (run.items.every((i) => i.paid)) run.status = 'paid';
    await run.save();
    res.json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const getEmployeePayslips = async (req, res) => {
  try {
    const { HrmsPayrollRun } = M(req);
    const runs = await HrmsPayrollRun.find({ 'items.employee': req.params.employeeId })
      .sort({ period: -1 }).limit(24);
    const payslips = runs.flatMap((run) => run.items
      .filter((i) => String(i.employee) === String(req.params.employeeId))
      .map((slip) => ({ period: run.period, runId: run._id, status: run.status, slip })));
    res.json({ items: payslips, total: payslips.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  // pure calculators
  monthlyCTCGross,
  baseEarningsFor,
  overtimePay,
  nightDifferentialPay,
  hazardPay,
  onCallStandbyPay,
  progressiveIncomeTax,
  statutoryDeductions,
  buildPayslipCalc,
  round2,
  // http handlers
  listPayProfiles,
  getPayProfile,
  upsertPayProfile,
  deletePayProfile,
  getPayrollPolicy,
  updatePayrollPolicy,
  listRuns,
  getRun,
  generateRun,
  recalculateRun,
  updateSlip,
  transitionStatus,
  markSlipPaid,
  getEmployeePayslips,
};
