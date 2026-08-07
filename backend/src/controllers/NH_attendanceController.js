const AttendanceBase = require('../models/NH_Attendance');
const AttendanceLocationBase = require('../models/NH_AttendanceLocation');
const EmployeeBase = require('../models/NH_Employee');
const UserBase = require('../models/NH_User');
const { getModel } = require('../utils/tenantModel');

const M = (req) => ({
  Attendance: getModel(req, 'Attendance', AttendanceBase),
  AttendanceLocation: getModel(req, 'AttendanceLocation', AttendanceLocationBase),
  User: getModel(req, 'User', UserBase),
  Employee: getModel(req, 'Employee', EmployeeBase),
});

const randomToken = () => AttendanceLocationBase.generateToken();

/** Local calendar day key (YYYY-MM-DD). */
const dayKey = (date = new Date()) => {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`;
};

const ADMIN_ROLES = ['hospital_admin', 'super_admin'];
const isAdmin = (user) => ADMIN_ROLES.includes(user?.role);

// ---------- Locations ----------

const listLocations = async (req, res) => {
  try {
    const { AttendanceLocation } = M(req);
    const items = await AttendanceLocation.find({}).sort({ createdAt: -1 });
    // Non-admins never need the raw token (it is the secret in the poster QR).
    const payload = isAdmin(req.user)
      ? items
      : items.map((l) => ({ _id: l._id, name: l.name, code: l.code, isActive: l.isActive }));
    res.json({ items: payload, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createLocation = async (req, res) => {
  try {
    const { AttendanceLocation } = M(req);
    const { name, code, description, latitude, longitude, radiusMeters } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Location name is required' });
    const location = await AttendanceLocation.create({
      name, code, description, latitude, longitude, radiusMeters,
      token: randomToken(),
      createdBy: req.user._id,
    });
    res.status(201).json(location);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { AttendanceLocation } = M(req);
    const location = await AttendanceLocation.findById(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    ['name', 'code', 'description', 'latitude', 'longitude', 'radiusMeters', 'isActive'].forEach((k) => {
      if (req.body?.[k] !== undefined) location[k] = req.body[k];
    });
    location.lastUpdatedBy = req.user._id;
    await location.save();
    res.json(location);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/** Rotate the QR token (invalidates previously printed posters). */
const rotateLocationToken = async (req, res) => {
  try {
    const { AttendanceLocation } = M(req);
    const location = await AttendanceLocation.findById(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    location.token = randomToken();
    location.lastUpdatedBy = req.user._id;
    await location.save();
    res.json(location);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteLocation = async (req, res) => {
  try {
    const { AttendanceLocation } = M(req);
    const location = await AttendanceLocation.findById(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    location.isActive = false;
    await location.save();
    res.json({ success: true, message: 'Location deactivated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Scanning ----------

const LATE_AFTER_MINUTES = 10 * 60 + 15; // 10:15 local
const HALF_DAY_MINUTES = 240;

const minutesSinceMidnight = (date) => date.getHours() * 60 + date.getMinutes();

const extractToken = (raw) => {
  let val = String(raw || '').trim();
  if (!val) return '';
  if (val.startsWith('http://') || val.startsWith('https://')) {
    try {
      const url = new URL(val);
      const tokenParam = url.searchParams.get('token') || url.searchParams.get('code');
      if (tokenParam) return tokenParam.trim();
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1].trim();
    } catch (e) {}
  }
  return val;
};

/**
 * Employee scans the location poster QR or ID card QR. First scan of the day = check-in,
 * next scan = check-out. Idempotent within a 2 minute window to absorb
 * accidental double scans.
 */
const scanAttendance = async (req, res) => {
  try {
    const { Attendance, AttendanceLocation, Employee } = M(req);
    const { token: rawToken, latitude, longitude, mode } = req.body || {};
    const token = extractToken(rawToken);
    if (!token) return res.status(400).json({ message: 'Scan a valid attendance QR code' });

    // Check if payload is an Employee ID Card QR (e.g. EMP|EMP-001|cardToken or raw cardToken)
    let isEmployeeCard = token.startsWith('EMP|');
    if (!isEmployeeCard) {
      const card = parseCardPayload(token);
      if (card && card.cardToken) {
        const empExists = await Employee.exists({ cardToken: card.cardToken });
        if (empExists) isEmployeeCard = true;
      }
    }

    if (isEmployeeCard) {
      req.body.employeeToken = token;
      return scanEmployeeCard(req, res);
    }

    const location = await AttendanceLocation.findOne({ token });
    if (!location) return res.status(404).json({ message: 'This QR code is not recognised' });
    if (!location.isActive) return res.status(400).json({ message: `${location.name} is no longer active for attendance` });

    const now = new Date();
    const day = dayKey(now);
    const punch = {
      at: now,
      location: location._id,
      locationName: location.name,
      method: 'qr_scan',
      latitude,
      longitude,
      markedBy: req.user._id,
    };

    let record = await Attendance.findOne({ user: req.user._id, day });

    if (!record) {
      record = await Attendance.create({
        user: req.user._id,
        userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
        role: req.user.role,
        day,
        checkIn: punch,
        status: minutesSinceMidnight(now) > LATE_AFTER_MINUTES ? 'checked_in' : 'checked_in',
      });
      return res.status(201).json({ action: 'checked_in', record, location: location.name });
    }

    if (!record.checkIn?.at) {
      record.checkIn = punch;
      record.status = 'checked_in';
      await record.save();
      return res.json({ action: 'checked_in', record, location: location.name });
    }

    const lastPunchAt = record.checkOut?.at || record.checkIn?.at;
    if (lastPunchAt && now - new Date(lastPunchAt) < 2 * 60 * 1000) {
      return res.status(200).json({
        action: 'duplicate',
        message: 'Already recorded a moment ago',
        record,
        location: location.name,
      });
    }

    if (mode === 'in') {
      return res.status(400).json({ message: 'You are already checked in today' });
    }

    record.checkOut = punch;
    const minutes = Math.max(0, Math.round((now - new Date(record.checkIn.at)) / 60000));
    record.totalMinutes = minutes;
    record.status = minutes < HALF_DAY_MINUTES ? 'half_day' : 'present';
    await record.save();
    return res.json({ action: 'checked_out', record, location: location.name });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


/**
 * Kiosk flow: the attendance point operator scans an employee ID card QR.
 * Card payload is `EMP|<employeeCode>|<cardToken>` (raw token also accepted).
 * The employee's linked login is used as the attendance key when present,
 * otherwise the employee id itself keys the day record.
 */
const parseCardPayload = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return null;
  const parts = value.split('|');
  if (parts[0] === 'EMP' && parts.length >= 3) {
    return { employeeCode: parts[1], cardToken: parts[2] };
  }
  return { employeeCode: null, cardToken: value };
};

const scanEmployeeCard = async (req, res) => {
  try {
    const { Attendance, AttendanceLocation, Employee } = M(req);
    const { employeeToken, locationToken, latitude, longitude } = req.body || {};
    const card = parseCardPayload(employeeToken);
    if (!card) return res.status(400).json({ message: 'Scan a valid employee ID card' });

    const employee = await Employee.findOne({ cardToken: card.cardToken });
    if (!employee) return res.status(404).json({ message: 'This ID card is not recognised' });
    if (!employee.isActive) return res.status(400).json({ message: `${employee.firstName} is no longer active` });
    if (card.employeeCode && card.employeeCode !== employee.employeeCode) {
      return res.status(400).json({ message: 'ID card data does not match our records' });
    }

    let location = null;
    if (locationToken) {
      location = await AttendanceLocation.findOne({ token: String(locationToken).trim() });
      if (!location) return res.status(404).json({ message: 'Attendance point QR is not recognised' });
      if (!location.isActive) return res.status(400).json({ message: `${location.name} is no longer active` });
    }

    const now = new Date();
    const day = dayKey(now);
    const subjectId = employee.user || employee._id;
    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    const punch = {
      at: now,
      location: location?._id,
      locationName: location?.name,
      method: 'id_card',
      latitude,
      longitude,
      markedBy: req.user._id,
    };

    let record = await Attendance.findOne({ user: subjectId, day });
    if (!record) {
      record = await Attendance.create({
        user: subjectId,
        employee: employee._id,
        employeeCode: employee.employeeCode,
        userName: fullName,
        role: employee.designation || employee.department,
        day,
        checkIn: punch,
        status: 'checked_in',
      });
      return res.status(201).json({ action: 'checked_in', employee: fullName, record, location: location?.name });
    }

    if (!record.employee) {
      record.employee = employee._id;
      record.employeeCode = employee.employeeCode;
    }

    if (!record.checkIn?.at) {
      record.checkIn = punch;
      record.status = 'checked_in';
      await record.save();
      return res.json({ action: 'checked_in', employee: fullName, record, location: location?.name });
    }

    const lastPunchAt = record.checkOut?.at || record.checkIn?.at;
    if (lastPunchAt && now - new Date(lastPunchAt) < 2 * 60 * 1000) {
      return res.json({ action: 'duplicate', employee: fullName, message: 'Already recorded a moment ago', record });
    }

    record.checkOut = punch;
    const minutes = Math.max(0, Math.round((now - new Date(record.checkIn.at)) / 60000));
    record.totalMinutes = minutes;
    record.status = minutes < HALF_DAY_MINUTES ? 'half_day' : 'present';
    await record.save();
    return res.json({ action: 'checked_out', employee: fullName, record, location: location?.name });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Reads ----------

const buildDayRange = ({ from, to, day }) => {
  if (day) return { day };
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = dayKey(from);
  if (to) range.$lte = dayKey(to);
  return { day: range };
};

const listAttendance = async (req, res) => {
  try {
    const { Attendance } = M(req);
    const query = buildDayRange(req.query);
    if (req.query.userId) query.user = req.query.userId;
    if (req.query.status) query.status = req.query.status;
    if (!isAdmin(req.user)) query.user = req.user._id;
    const items = await Attendance.find(query)
      .populate('user', 'firstName lastName role department email')
      .sort({ day: -1, 'checkIn.at': -1 })
      .limit(1000);
    const summary = items.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      acc.totalHours = Math.round(((acc.totalHours || 0) + (r.totalMinutes || 0) / 60) * 100) / 100;
      return acc;
    }, {});
    res.json({ items, total: items.length, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const { Attendance } = M(req);
    const today = await Attendance.findOne({ user: req.user._id, day: dayKey() });
    const recent = await Attendance.find({ user: req.user._id }).sort({ day: -1 }).limit(30);
    res.json({ today, recent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** Admin manual override (missed scan / leave marking). */
const upsertManualAttendance = async (req, res) => {
  try {
    const { Attendance, User } = M(req);
    const { userId, day, checkInAt, checkOutAt, status, notes } = req.body || {};
    if (!userId || !day) return res.status(400).json({ message: 'userId and day are required' });
    const staff = await User.findById(userId);
    if (!staff) return res.status(404).json({ message: 'Employee not found' });

    const record = await Attendance.findOne({ user: userId, day }) || new Attendance({
      user: userId,
      userName: `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
      role: staff.role,
      day,
    });

    if (checkInAt) record.checkIn = { at: new Date(checkInAt), method: 'manual', markedBy: req.user._id };
    if (checkOutAt) record.checkOut = { at: new Date(checkOutAt), method: 'manual', markedBy: req.user._id };
    if (record.checkIn?.at && record.checkOut?.at) {
      record.totalMinutes = Math.max(0, Math.round((new Date(record.checkOut.at) - new Date(record.checkIn.at)) / 60000));
    }
    if (status) record.status = status;
    if (notes !== undefined) record.notes = notes;
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  listLocations,
  createLocation,
  updateLocation,
  rotateLocationToken,
  deleteLocation,
  scanAttendance,
  scanEmployeeCard,
  listAttendance,
  getMyAttendance,
  upsertManualAttendance,
  dayKey,
};
