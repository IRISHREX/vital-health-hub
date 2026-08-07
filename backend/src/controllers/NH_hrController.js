const EmployeeBase = require('../models/NH_Employee');
const LeaveRequestBase = require('../models/NH_LeaveRequest');
const PayrollRunBase = require('../models/NH_PayrollRun');
const AttendanceBase = require('../models/NH_Attendance');
const ExpenseBase = require('../models/NH_Expense');
const UserBase = require('../models/NH_User');
const { getModel } = require('../utils/tenantModel');
const { nextTenantSequence } = require('../utils/tenantSequence');

const M = (req) => ({
  Employee: getModel(req, 'Employee', EmployeeBase),
  LeaveRequest: getModel(req, 'LeaveRequest', LeaveRequestBase),
  PayrollRun: getModel(req, 'PayrollRun', PayrollRunBase),
  Attendance: getModel(req, 'Attendance', AttendanceBase),
  Expense: getModel(req, 'Expense', ExpenseBase),
  User: getModel(req, 'User', UserBase),
});

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pad2 = (n) => String(n).padStart(2, '0');
const periodKey = (year, month) => `${year}-${pad2(month)}`;
const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const parsePaging = (q) => {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 200);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
};

// ---------- pure payroll math ----------

/** Full monthly gross for a salary structure (before proration). */
const fullGross = (salary = {}) =>
  round2(Number(salary.basic || 0) + Number(salary.hra || 0) + Number(salary.allowances || 0));

/** Earned gross for the days/hours actually worked. */
const earnedGrossFor = (salary = {}, { payableDays, monthDays, workedHours }) => {
  const mode = salary.mode || 'monthly';
  if (mode === 'daily') return round2(Number(salary.dailyRate || 0) * payableDays);
  if (mode === 'hourly') return round2(Number(salary.hourlyRate || 0) * (workedHours || 0));
  const gross = fullGross(salary);
  if (!monthDays) return 0;
  return round2((gross * payableDays) / monthDays);
};

/** Statutory + ad-hoc deductions for an earned gross. */
const deductionsFor = (salary = {}, earnedGross) => {
  const pf = round2((earnedGross * Number(salary.pfPercent || 0)) / 100);
  const esi = round2((earnedGross * Number(salary.esiPercent || 0)) / 100);
  const professionalTax = round2(salary.professionalTax || 0);
  const otherDeductions = round2(salary.otherDeductions || 0);
  return { pf, esi, professionalTax, otherDeductions, total: round2(pf + esi + professionalTax + otherDeductions) };
};

/** Attendance-derived payable days for one employee in a period. */
const attendanceSummary = (records = []) => {
  let presentDays = 0;
  let workedMinutes = 0;
  let leaveDays = 0;
  records.forEach((r) => {
    if (r.status === 'present' || r.status === 'checked_in') presentDays += 1;
    else if (r.status === 'half_day') presentDays += 0.5;
    else if (r.status === 'leave') leaveDays += 1;
    workedMinutes += Number(r.totalMinutes || 0);
  });
  return { presentDays, leaveDays, workedHours: round2(workedMinutes / 60) };
};

const buildPayslip = ({ employee, records, paidLeaveDays, unpaidLeaveDays, monthDays }) => {
  const { presentDays, workedHours } = attendanceSummary(records);
  const payableDays = Math.min(monthDays, round2(presentDays + paidLeaveDays));
  const earnedGross = earnedGrossFor(employee.salary, { payableDays, monthDays, workedHours });
  const d = deductionsFor(employee.salary, earnedGross);
  return {
    employee: employee._id,
    employeeCode: employee.employeeCode,
    employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
    designation: employee.designation,
    module: employee.module,
    monthDays,
    presentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    payableDays,
    workedHours,
    grossFull: fullGross(employee.salary),
    earnedGross,
    pf: d.pf,
    esi: d.esi,
    professionalTax: d.professionalTax,
    otherDeductions: d.otherDeductions,
    bonus: 0,
    totalDeductions: d.total,
    netPay: round2(earnedGross - d.total),
    paid: false,
  };
};

const rollupRun = (run) => {
  run.totalGross = round2(run.items.reduce((s, i) => s + Number(i.earnedGross || 0) + Number(i.bonus || 0), 0));
  run.totalDeductions = round2(run.items.reduce((s, i) => s + Number(i.totalDeductions || 0), 0));
  run.totalNet = round2(run.items.reduce((s, i) => s + Number(i.netPay || 0), 0));
  run.totalPaid = round2(run.items.filter((i) => i.paid).reduce((s, i) => s + Number(i.netPay || 0), 0));
  return run;
};

// ---------- Employees ----------

const listEmployees = async (req, res) => {
  try {
    const { Employee } = M(req);
    const { limit, page, skip } = parsePaging(req.query);
    const query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.module) query.module = req.query.module;
    if (req.query.employmentType) query.employmentType = req.query.employmentType;
    if (req.query.active === 'true') query.isActive = true;
    if (req.query.active === 'false') query.isActive = false;
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
      query.$or = [
        { firstName: rx }, { lastName: rx }, { employeeCode: rx },
        { designation: rx }, { department: rx }, { phone: rx }, { email: rx },
      ];
    }
    const [items, total] = await Promise.all([
      Employee.find(query).populate('user', 'firstName lastName email role')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Employee.countDocuments(query),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEmployee = async (req, res) => {
  try {
    const { Employee } = M(req);
    const employee = await Employee.findById(req.params.id).populate('user', 'firstName lastName email role');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { Employee } = M(req);
    const { firstName } = req.body || {};
    if (!firstName?.trim()) return res.status(400).json({ message: 'First name is required' });
    const employeeCode = req.body.employeeCode?.trim() || await nextTenantSequence(req, 'employee', 'EMP');
    const exists = await Employee.findOne({ employeeCode });
    if (exists) return res.status(400).json({ message: `Employee code ${employeeCode} already exists` });
    const employee = await Employee.create({
      ...req.body,
      employeeCode,
      cardToken: EmployeeBase.generateCardToken(),
      createdBy: req.user._id,
    });
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const IMMUTABLE = ['_id', 'employeeCode', 'cardToken', 'createdBy', 'createdAt', 'updatedAt'];

const updateEmployee = async (req, res) => {
  try {
    const { Employee } = M(req);
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    Object.entries(req.body || {}).forEach(([key, value]) => {
      if (IMMUTABLE.includes(key)) return;
      employee[key] = value;
    });
    employee.lastUpdatedBy = req.user._id;
    await employee.save();
    res.json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deactivateEmployee = async (req, res) => {
  try {
    const { Employee } = M(req);
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    employee.isActive = false;
    employee.exitDate = req.body?.exitDate ? new Date(req.body.exitDate) : new Date();
    employee.lastUpdatedBy = req.user._id;
    await employee.save();
    res.json({ success: true, employee });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Rotate the ID card secret (lost card) — old cards stop working immediately. */
const rotateEmployeeCard = async (req, res) => {
  try {
    const { Employee } = M(req);
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    employee.cardToken = EmployeeBase.generateCardToken();
    employee.cardIssuedAt = new Date();
    employee.lastUpdatedBy = req.user._id;
    await employee.save();
    res.json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Mark the card as issued/printed (audit of physical handover). */
const markCardIssued = async (req, res) => {
  try {
    const { Employee } = M(req);
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    employee.cardIssuedAt = new Date();
    await employee.save();
    res.json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Leave ----------

const listLeaveRequests = async (req, res) => {
  try {
    const { LeaveRequest } = M(req);
    const { limit, page, skip } = parsePaging(req.query);
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.employeeId) query.employee = req.query.employeeId;
    if (req.query.from || req.query.to) {
      query.from = {};
      if (req.query.from) query.from.$gte = new Date(req.query.from);
      if (req.query.to) query.from.$lte = new Date(`${req.query.to}T23:59:59.999`);
    }
    const [items, total] = await Promise.all([
      LeaveRequest.find(query).populate('employee', 'firstName lastName employeeCode department leaveBalance')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      LeaveRequest.countDocuments(query),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const dayDiff = (from, to) => Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1);

const createLeaveRequest = async (req, res) => {
  try {
    const { LeaveRequest, Employee } = M(req);
    const { employeeId, leaveType, from, to, reason } = req.body || {};
    if (!employeeId || !from || !to) {
      return res.status(400).json({ message: 'employeeId, from and to are required' });
    }
    if (new Date(to) < new Date(from)) return res.status(400).json({ message: 'End date cannot be before start date' });
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const days = Number(req.body.days) || dayDiff(from, to);
    const request = await LeaveRequest.create({
      requestNumber: await nextTenantSequence(req, 'leaveRequest', 'LV'),
      employee: employee._id,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      leaveType: leaveType || 'casual',
      from: new Date(from),
      to: new Date(to),
      days,
      reason,
      createdBy: req.user._id,
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Approve / reject. Approval debits the matching paid-leave balance. */
const decideLeaveRequest = async (req, res) => {
  try {
    const { LeaveRequest, Employee } = M(req);
    const { status, decisionNote } = req.body || {};
    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'status must be approved, rejected or cancelled' });
    }
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Leave request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }
    if (status === 'approved') {
      const employee = await Employee.findById(request.employee);
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      if (request.leaveType === 'unpaid') {
        employee.leaveBalance.unpaidTaken = Number(employee.leaveBalance.unpaidTaken || 0) + request.days;
      } else {
        const available = Number(employee.leaveBalance?.[request.leaveType] || 0);
        if (available < request.days) {
          return res.status(400).json({ message: `Only ${available} ${request.leaveType} leave day(s) left` });
        }
        employee.leaveBalance[request.leaveType] = round2(available - request.days);
      }
      await employee.save();
    }
    request.status = status;
    request.decidedBy = req.user._id;
    request.decidedAt = new Date();
    request.decisionNote = decisionNote;
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Payroll ----------

const listPayrollRuns = async (req, res) => {
  try {
    const { PayrollRun } = M(req);
    const query = {};
    if (req.query.year) query.year = Number(req.query.year);
    if (req.query.status) query.status = req.query.status;
    const items = await PayrollRun.find(query).sort({ period: -1 }).limit(60);
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPayrollRun = async (req, res) => {
  try {
    const { PayrollRun } = M(req);
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** Build (or rebuild, while draft) a month's payroll from attendance + leave. */
const generatePayrollRun = async (req, res) => {
  try {
    const { PayrollRun, Employee, LeaveRequest, Attendance } = M(req);
    const month = Number(req.body?.month);
    const year = Number(req.body?.year);
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) and year are required' });
    }
    const period = periodKey(year, month);
    const existing = await PayrollRun.findOne({ period });
    if (existing && existing.status !== 'draft') {
      return res.status(400).json({ message: `Payroll for ${period} is already ${existing.status}` });
    }

    const monthDays = daysInMonth(year, month);
    const dayPrefix = `${year}-${pad2(month)}`;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month - 1, monthDays, 23, 59, 59, 999);

    const [employees, attendance, approvedLeave] = await Promise.all([
      Employee.find({ isActive: true }),
      Attendance.find({ day: new RegExp(`^${dayPrefix}`) }).select('user employee status totalMinutes day'),
      LeaveRequest.find({ status: 'approved', from: { $lte: monthEnd }, to: { $gte: monthStart } }),
    ]);

    const byEmployee = new Map();
    attendance.forEach((r) => {
      const keys = [String(r.employee || ''), String(r.user || '')].filter(Boolean);
      keys.forEach((k) => {
        if (!byEmployee.has(k)) byEmployee.set(k, []);
        byEmployee.get(k).push(r);
      });
    });

    const leaveByEmployee = new Map();
    approvedLeave.forEach((l) => {
      const key = String(l.employee);
      const bucket = leaveByEmployee.get(key) || { paid: 0, unpaid: 0 };
      if (l.leaveType === 'unpaid') bucket.unpaid += l.days;
      else bucket.paid += l.days;
      leaveByEmployee.set(key, bucket);
    });

    const items = employees.map((employee) => {
      const records = byEmployee.get(String(employee._id))
        || (employee.user ? byEmployee.get(String(employee.user)) : null)
        || [];
      const leave = leaveByEmployee.get(String(employee._id)) || { paid: 0, unpaid: 0 };
      return buildPayslip({
        employee,
        records,
        paidLeaveDays: leave.paid,
        unpaidLeaveDays: leave.unpaid,
        monthDays,
      });
    });

    const run = existing || new PayrollRun({
      runNumber: await nextTenantSequence(req, 'payrollRun', 'PR'),
      period, month, year, createdBy: req.user._id,
    });
    run.items = items;
    run.status = 'draft';
    rollupRun(run);
    await run.save();
    res.status(existing ? 200 : 201).json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Adjust a single payslip (bonus / extra deduction / note) while in draft. */
const updatePayslip = async (req, res) => {
  try {
    const { PayrollRun } = M(req);
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status === 'cancelled') return res.status(400).json({ message: 'Run is cancelled' });
    const slip = run.items.id(req.params.slipId);
    if (!slip) return res.status(404).json({ message: 'Payslip not found' });
    if (slip.paid) return res.status(400).json({ message: 'Paid payslips cannot be edited' });
    if (req.body?.bonus !== undefined) slip.bonus = Math.max(0, Number(req.body.bonus) || 0);
    if (req.body?.otherDeductions !== undefined) slip.otherDeductions = Math.max(0, Number(req.body.otherDeductions) || 0);
    if (req.body?.notes !== undefined) slip.notes = req.body.notes;
    slip.totalDeductions = round2(slip.pf + slip.esi + slip.professionalTax + slip.otherDeductions);
    slip.netPay = round2(Number(slip.earnedGross || 0) + Number(slip.bonus || 0) - slip.totalDeductions);
    rollupRun(run);
    await run.save();
    res.json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const finalizePayrollRun = async (req, res) => {
  try {
    const { PayrollRun } = M(req);
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status !== 'draft') return res.status(400).json({ message: `Run is already ${run.status}` });
    if (!run.items.length) return res.status(400).json({ message: 'Nothing to finalize — generate the run first' });
    run.status = 'finalized';
    run.finalizedAt = new Date();
    run.finalizedBy = req.user._id;
    await run.save();
    res.json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Record salary payment for one payslip and post the matching expense so the
 * P&L picks up staff cost against the employee's module.
 */
const payPayslip = async (req, res) => {
  try {
    const { PayrollRun, Expense } = M(req);
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status === 'draft') return res.status(400).json({ message: 'Finalize the payroll run before paying' });
    const slip = run.items.id(req.params.slipId);
    if (!slip) return res.status(404).json({ message: 'Payslip not found' });
    if (slip.paid) return res.status(400).json({ message: 'This payslip is already paid' });

    slip.paid = true;
    slip.paidAt = req.body?.paidAt ? new Date(req.body.paidAt) : new Date();
    slip.paymentMode = req.body?.paymentMode || 'bank_transfer';
    slip.paymentReference = req.body?.paymentReference;
    rollupRun(run);
    if (run.items.every((i) => i.paid)) run.status = 'paid';
    await run.save();

    await Expense.create({
      expenseNumber: await nextTenantSequence(req, 'expense', 'EXP'),
      date: slip.paidAt,
      module: ['general', 'opd', 'ipd', 'lab', 'radiology', 'pharmacy', 'ot', 'nursing', 'administration', 'housekeeping', 'billing'].includes(slip.module)
        ? slip.module : 'hr',
      category: 'salary',
      description: `Salary ${run.period} — ${slip.employeeName} (${slip.employeeCode})`,
      amount: slip.netPay,
      paymentMode: slip.paymentMode === 'bank_transfer' ? 'bank_transfer' : slip.paymentMode,
      status: 'paid',
      paidAt: slip.paidAt,
      sourceType: 'payroll',
      sourceId: run._id,
      recordedBy: req.user._id,
    });

    res.json(run);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Summary ----------

const getHrSummary = async (req, res) => {
  try {
    const { Employee, LeaveRequest, PayrollRun } = M(req);
    const now = new Date();
    const period = periodKey(now.getFullYear(), now.getMonth() + 1);
    const [total, active, pendingLeave, byDepartment, latestRun] = await Promise.all([
      Employee.countDocuments({}),
      Employee.countDocuments({ isActive: true }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      Employee.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      PayrollRun.findOne({ period }),
    ]);
    const activeEmployees = await Employee.find({ isActive: true }).select('salary');
    const monthlyCost = round2(activeEmployees.reduce((s, e) => s + fullGross(e.salary), 0));
    res.json({
      totalEmployees: total,
      activeEmployees: active,
      pendingLeave,
      monthlySalaryCost: monthlyCost,
      byDepartment: byDepartment.map((d) => ({ department: d._id || 'Unassigned', count: d.count })),
      currentPeriod: period,
      currentRun: latestRun ? { _id: latestRun._id, status: latestRun.status, totalNet: latestRun.totalNet } : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  rotateEmployeeCard,
  markCardIssued,
  listLeaveRequests,
  createLeaveRequest,
  decideLeaveRequest,
  listPayrollRuns,
  getPayrollRun,
  generatePayrollRun,
  updatePayslip,
  finalizePayrollRun,
  payPayslip,
  getHrSummary,
  // exported for unit tests
  fullGross,
  earnedGrossFor,
  deductionsFor,
  attendanceSummary,
};
