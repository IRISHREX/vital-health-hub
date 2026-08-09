const EmployeeBase = require('../models/NH_Employee');
const UserBase = require('../models/NH_User');
const NotificationBase = require('../models/NH_Notification');
const { getModel } = require('../utils/tenantModel');
const { nextTenantSequence } = require('../utils/tenantSequence');

const M = (req) => ({
  Employee: getModel(req, 'Employee', EmployeeBase),
  User: getModel(req, 'User', UserBase),
  Notification: getModel(req, 'Notification', NotificationBase),
});

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePaging = (q) => {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 200);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
};

const SUB_ARRAYS = {
  licenses: 'licenses',
  certifications: 'certifications',
  immunizations: 'immunizations',
  healthChecks: 'healthChecks',
  hazardExposures: 'hazardExposures',
  privileges: 'privileges',
};

// ---------- pure compliance helpers ----------

const MS_DAY = 86400000;

/** Days remaining until `date` from `now` (negative if already past). */
const daysUntil = (date, now = new Date()) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / MS_DAY);
};

/**
 * Pure: bucket a single expiry date into a compliance severity.
 * Returns one of: 'overdue' | 'due_30' | 'due_60' | 'due_90' | 'ok' | null (no expiry set).
 */
const bucketForExpiry = (expiresOn, now = new Date()) => {
  const days = daysUntil(expiresOn, now);
  if (days === null) return null;
  if (days < 0) return 'overdue';
  if (days <= 30) return 'due_30';
  if (days <= 60) return 'due_60';
  if (days <= 90) return 'due_90';
  return 'ok';
};

/** Pure: extract all expiry-trackable items for one employee across sub-arrays. */
const collectExpiryItems = (employee) => {
  const items = [];
  (employee.licenses || []).forEach((l) => items.push({
    kind: 'license', label: `${l.type || 'License'}${l.number ? ` (${l.number})` : ''}`,
    expiresOn: l.expiresOn, itemId: l._id,
  }));
  (employee.certifications || []).forEach((c) => items.push({
    kind: 'certification', label: c.name || 'Certification', expiresOn: c.expiresOn, itemId: c._id,
  }));
  (employee.immunizations || []).forEach((i) => items.push({
    kind: 'immunization', label: `${i.vaccine || 'Immunization'}${i.doseLabel ? ` - ${i.doseLabel}` : ''}`,
    expiresOn: i.nextDueOn, itemId: i._id,
  }));
  (employee.healthChecks || []).forEach((h) => items.push({
    kind: 'healthCheck', label: h.checkType || 'Health check', expiresOn: h.nextDueOn, itemId: h._id,
  }));
  (employee.privileges || []).forEach((p) => items.push({
    kind: 'privilege', label: p.procedure || 'Privilege', expiresOn: p.expiresOn, itemId: p._id,
  }));
  return items;
};

/**
 * Pure: build the full compliance report for a list of employees.
 * Returns { perEmployee: [...], aggregate: { overdue, due_30, due_60, due_90, ok } }.
 */
const buildComplianceReport = (employees, now = new Date()) => {
  const aggregate = { overdue: 0, due_30: 0, due_60: 0, due_90: 0, ok: 0 };
  const perEmployee = [];
  employees.forEach((employee) => {
    const items = collectExpiryItems(employee)
      .map((item) => ({ ...item, bucket: bucketForExpiry(item.expiresOn, now), daysRemaining: daysUntil(item.expiresOn, now) }))
      .filter((item) => item.bucket);
    items.forEach((item) => { aggregate[item.bucket] = (aggregate[item.bucket] || 0) + 1; });
    const flagged = items.filter((i) => i.bucket !== 'ok');
    if (flagged.length) {
      perEmployee.push({
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        staffCategory: employee.staffCategory,
        department: employee.department,
        items: flagged,
        worstBucket: flagged.some((i) => i.bucket === 'overdue') ? 'overdue'
          : flagged.some((i) => i.bucket === 'due_30') ? 'due_30'
          : flagged.some((i) => i.bucket === 'due_60') ? 'due_60' : 'due_90',
      });
    }
  });
  return { perEmployee, aggregate };
};

/** Aggregate compliance status label for an employee (used as a list filter). */
const complianceStatusForEmployee = (employee, now = new Date()) => {
  const items = collectExpiryItems(employee).map((i) => bucketForExpiry(i.expiresOn, now)).filter(Boolean);
  if (items.includes('overdue')) return 'overdue';
  if (items.includes('due_30')) return 'due_30';
  if (items.includes('due_60')) return 'due_60';
  if (items.includes('due_90')) return 'due_90';
  return 'ok';
};

// ---------- Employees ----------

const listEmployees = async (req, res) => {
  try {
    const { Employee } = M(req);
    const { limit, page, skip } = parsePaging(req.query);
    const query = {};
    if (req.query.staffCategory) query.staffCategory = req.query.staffCategory;
    if (req.query.department) query.department = req.query.department;
    if (req.query.isActive === 'true') query.isActive = true;
    if (req.query.isActive === 'false') query.isActive = false;
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
      query.$or = [
        { firstName: rx }, { lastName: rx }, { employeeCode: rx },
        { designation: rx }, { department: rx }, { phone: rx }, { email: rx },
      ];
    }
    let items = await Employee.find(query).sort({ createdAt: -1 });
    const total = items.length;
    if (req.query.complianceStatus) {
      items = items.filter((e) => complianceStatusForEmployee(e) === req.query.complianceStatus);
    }
    const paged = items.slice(skip, skip + limit);
    res.json({ items: paged, total: req.query.complianceStatus ? items.length : total, page, limit, pages: Math.ceil((req.query.complianceStatus ? items.length : total) / limit) || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEmployee = async (req, res) => {
  try {
    const { Employee } = M(req);
    const employee = await Employee.findById(req.params.id);
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

const IMMUTABLE = ['_id', 'employeeCode', 'cardToken', 'createdBy', 'createdAt', 'updatedAt'];

const updateEmployee = async (req, res) => {
  try {
    const { Employee } = M(req);
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    Object.entries(req.body || {}).forEach(([key, value]) => {
      if (IMMUTABLE.includes(key)) return;
      if (SUB_ARRAYS[key]) return; // sub-arrays are mutated via dedicated endpoints
      employee[key] = value;
    });
    employee.lastUpdatedBy = req.user._id;
    await employee.save();
    res.json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Generic sub-array CRUD ----------

/** Factory: builds add/update/remove handlers for one sub-array field. */
const subArrayHandlers = (field) => ({
  add: async (req, res) => {
    try {
      const { Employee } = M(req);
      const employee = await Employee.findById(req.params.id);
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      employee[field].push(req.body || {});
      employee.lastUpdatedBy = req.user._id;
      await employee.save();
      res.status(201).json(employee);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
  update: async (req, res) => {
    try {
      const { Employee } = M(req);
      const employee = await Employee.findById(req.params.id);
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      const entry = employee[field].id(req.params.itemId);
      if (!entry) return res.status(404).json({ message: 'Entry not found' });
      Object.entries(req.body || {}).forEach(([key, value]) => {
        if (key === '_id') return;
        entry[key] = value;
      });
      employee.lastUpdatedBy = req.user._id;
      await employee.save();
      res.json(employee);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
  remove: async (req, res) => {
    try {
      const { Employee } = M(req);
      const employee = await Employee.findById(req.params.id);
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      employee[field].pull({ _id: req.params.itemId });
      employee.lastUpdatedBy = req.user._id;
      await employee.save();
      res.json(employee);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
});

const licenses = subArrayHandlers('licenses');
const certifications = subArrayHandlers('certifications');
const immunizations = subArrayHandlers('immunizations');
const healthChecks = subArrayHandlers('healthChecks');
const hazardExposures = subArrayHandlers('hazardExposures');
const privileges = subArrayHandlers('privileges');

// ---------- Compliance dashboard + alerts ----------

const complianceDashboard = async (req, res) => {
  try {
    const { Employee } = M(req);
    const query = { isActive: true };
    if (req.query.staffCategory) query.staffCategory = req.query.staffCategory;
    if (req.query.department) query.department = req.query.department;
    const employees = await Employee.find(query);
    const report = buildComplianceReport(employees);
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** Create de-duplicated Notification docs for items crossing 90/60/30/overdue thresholds today. */
const runComplianceAlerts = async (req) => {
  const { Employee, User, Notification } = M(req);
  const employees = await Employee.find({ isActive: true });
  const { perEmployee } = buildComplianceReport(employees);
  const admins = await User.find({ role: { $in: ['super_admin', 'hospital_admin'] }, isActive: true }).select('_id');
  if (!admins.length) return { created: 0 };

  const todayKey = new Date().toISOString().slice(0, 10);
  let created = 0;
  for (const emp of perEmployee) {
    for (const item of emp.items) {
      const dedupeLink = `hrms-compliance:${emp.employeeId}:${item.kind}:${item.itemId}:${item.bucket}:${todayKey}`;
      // eslint-disable-next-line no-await-in-loop
      const exists = await Notification.findOne({ 'data.link': dedupeLink });
      if (exists) continue;
      const title = item.bucket === 'overdue' ? 'Compliance item overdue' : `Compliance item due in ${item.bucket.replace('due_', '')} days`;
      const message = `${emp.employeeName} (${emp.employeeCode}) — ${item.label} ${item.bucket === 'overdue' ? 'has expired' : `expires in ${item.daysRemaining} day(s)`}.`;
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(admins.map((admin) => Notification.create({
        recipient: admin._id,
        type: 'alert',
        title,
        message,
        priority: item.bucket === 'overdue' ? 'urgent' : item.bucket === 'due_30' ? 'high' : 'medium',
        data: { entityType: 'employee', entityId: emp.employeeId, link: dedupeLink },
      }).catch(() => null)));
      created += 1;
    }
  }
  return { created };
};

const runComplianceAlertsEndpoint = async (req, res) => {
  try {
    const result = await runComplianceAlerts(req);
    res.json({ success: true, ...result });
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
  licenses,
  certifications,
  immunizations,
  healthChecks,
  hazardExposures,
  privileges,
  complianceDashboard,
  runComplianceAlerts,
  runComplianceAlertsEndpoint,
  // pure helpers, exported for unit tests
  bucketForExpiry,
  daysUntil,
  collectExpiryItems,
  buildComplianceReport,
  complianceStatusForEmployee,
};
