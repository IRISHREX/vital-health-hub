const BirthRecordBase = require('../models/NH_BirthRecord');
const DeathRecordBase = require('../models/NH_DeathRecord');
const { getModel } = require('../utils/tenantModel');
const { nextTenantSequence } = require('../utils/tenantSequence');

const M = (req) => ({
  BirthRecord: getModel(req, 'BirthRecord', BirthRecordBase),
  DeathRecord: getModel(req, 'DeathRecord', DeathRecordBase),
});

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePaging = ({ page, limit }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  return { limit: safeLimit, page: safePage, skip: (safePage - 1) * safeLimit };
};

const buildDateRange = (from, to) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return Object.keys(range).length ? range : null;
};

const buildBirthQuery = (q) => {
  const query = {};
  const range = buildDateRange(q.from, q.to);
  if (range) query.dateOfBirth = range;
  if (q.gender) query.gender = q.gender;
  if (q.status) query.status = q.status;
  if (q.deliveryType) query.deliveryType = q.deliveryType;
  if (q.ward) query.ward = q.ward;
  if (q.doctorId) query.attendingDoctor = q.doctorId;
  if (q.patientId) query.patient = q.patientId;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search.trim()), 'i');
    query.$or = [
      { babyName: rx }, { motherName: rx }, { fatherName: rx },
      { recordNumber: rx }, { certificateNumber: rx }, { phone: rx },
    ];
  }
  return query;
};

const buildDeathQuery = (q) => {
  const query = {};
  const range = buildDateRange(q.from, q.to);
  if (range) query.dateOfDeath = range;
  if (q.gender) query.gender = q.gender;
  if (q.status) query.status = q.status;
  if (q.mannerOfDeath) query.mannerOfDeath = q.mannerOfDeath;
  if (q.placeOfDeath) query.placeOfDeath = q.placeOfDeath;
  if (q.ward) query.ward = q.ward;
  if (q.doctorId) query.certifyingDoctor = q.doctorId;
  if (q.patientId) query.patient = q.patientId;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search.trim()), 'i');
    query.$or = [
      { deceasedName: rx }, { informantName: rx },
      { recordNumber: rx }, { certificateNumber: rx }, { phone: rx },
    ];
  }
  return query;
};

const POPULATE = [
  { path: 'patient', select: 'firstName lastName patientId phone gender' },
  { path: 'admission', select: 'admissionId status' },
  { path: 'createdBy', select: 'firstName lastName role' },
];

// ---------- Birth ----------

const listBirthRecords = async (req, res) => {
  try {
    const { BirthRecord } = M(req);
    const { limit, page, skip } = parsePaging(req.query);
    const query = buildBirthQuery(req.query);
    const [items, total] = await Promise.all([
      BirthRecord.find(query)
        .populate(POPULATE)
        .populate('attendingDoctor', 'firstName lastName specialization')
        .sort({ dateOfBirth: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BirthRecord.countDocuments(query),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBirthRecord = async (req, res) => {
  try {
    const { BirthRecord } = M(req);
    const record = await BirthRecord.findById(req.params.id)
      .populate(POPULATE)
      .populate('attendingDoctor', 'firstName lastName specialization registrationNumber')
      .populate('attendingNurse', 'firstName lastName');
    if (!record) return res.status(404).json({ message: 'Birth record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createBirthRecord = async (req, res) => {
  try {
    const { BirthRecord } = M(req);
    const { motherName, dateOfBirth } = req.body;
    if (!motherName || !dateOfBirth) {
      return res.status(400).json({ message: 'motherName and dateOfBirth are required' });
    }
    const recordNumber = await nextTenantSequence(req, 'birthRecord', 'BR');
    const record = await BirthRecord.create({
      ...req.body,
      recordNumber,
      createdBy: req.user._id,
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const IMMUTABLE = ['_id', 'recordNumber', 'createdBy', 'createdAt', 'updatedAt'];

const applyUpdate = (record, body, userId) => {
  Object.entries(body).forEach(([key, value]) => {
    if (IMMUTABLE.includes(key)) return;
    record[key] = value;
  });
  record.lastUpdatedBy = userId;
};

const updateBirthRecord = async (req, res) => {
  try {
    const { BirthRecord } = M(req);
    const record = await BirthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Birth record not found' });
    if (record.status === 'cancelled') {
      return res.status(400).json({ message: 'Cancelled records cannot be edited' });
    }
    applyUpdate(record, req.body, req.user._id);
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const issueBirthCertificate = async (req, res) => {
  try {
    const { BirthRecord } = M(req);
    const record = await BirthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Birth record not found' });
    if (record.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot issue a certificate for a cancelled record' });
    }
    if (!record.certificateNumber) {
      record.certificateNumber = await nextTenantSequence(req, 'birthCertificate', 'BC');
    }
    record.status = 'certificate_issued';
    record.issuedAt = new Date();
    record.issuedBy = req.user._id;
    record.lastUpdatedBy = req.user._id;
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const cancelBirthRecord = async (req, res) => {
  try {
    const { BirthRecord } = M(req);
    const record = await BirthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Birth record not found' });
    record.status = 'cancelled';
    record.cancelReason = req.body?.reason || 'Cancelled';
    record.lastUpdatedBy = req.user._id;
    await record.save();
    res.json({ success: true, record });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Death ----------

const listDeathRecords = async (req, res) => {
  try {
    const { DeathRecord } = M(req);
    const { limit, page, skip } = parsePaging(req.query);
    const query = buildDeathQuery(req.query);
    const [items, total] = await Promise.all([
      DeathRecord.find(query)
        .populate(POPULATE)
        .populate('certifyingDoctor', 'firstName lastName specialization')
        .sort({ dateOfDeath: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DeathRecord.countDocuments(query),
    ]);
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDeathRecord = async (req, res) => {
  try {
    const { DeathRecord } = M(req);
    const record = await DeathRecord.findById(req.params.id)
      .populate(POPULATE)
      .populate('certifyingDoctor', 'firstName lastName specialization registrationNumber');
    if (!record) return res.status(404).json({ message: 'Death record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createDeathRecord = async (req, res) => {
  try {
    const { DeathRecord } = M(req);
    const { deceasedName, dateOfDeath } = req.body;
    if (!deceasedName || !dateOfDeath) {
      return res.status(400).json({ message: 'deceasedName and dateOfDeath are required' });
    }
    const recordNumber = await nextTenantSequence(req, 'deathRecord', 'DR');
    const record = await DeathRecord.create({
      ...req.body,
      recordNumber,
      createdBy: req.user._id,
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateDeathRecord = async (req, res) => {
  try {
    const { DeathRecord } = M(req);
    const record = await DeathRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Death record not found' });
    if (record.status === 'cancelled') {
      return res.status(400).json({ message: 'Cancelled records cannot be edited' });
    }
    applyUpdate(record, req.body, req.user._id);
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const issueDeathCertificate = async (req, res) => {
  try {
    const { DeathRecord } = M(req);
    const record = await DeathRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Death record not found' });
    if (record.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot issue a certificate for a cancelled record' });
    }
    if (!record.causeImmediate) {
      return res.status(400).json({ message: 'Immediate cause of death is required before issuing a certificate' });
    }
    if (!record.certificateNumber) {
      record.certificateNumber = await nextTenantSequence(req, 'deathCertificate', 'DC');
    }
    record.status = 'certificate_issued';
    record.issuedAt = new Date();
    record.issuedBy = req.user._id;
    record.certifiedAt = record.certifiedAt || new Date();
    record.lastUpdatedBy = req.user._id;
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const cancelDeathRecord = async (req, res) => {
  try {
    const { DeathRecord } = M(req);
    const record = await DeathRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Death record not found' });
    record.status = 'cancelled';
    record.cancelReason = req.body?.reason || 'Cancelled';
    record.lastUpdatedBy = req.user._id;
    await record.save();
    res.json({ success: true, record });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ---------- Stats ----------

const getVitalRecordStats = async (req, res) => {
  try {
    const { BirthRecord, DeathRecord } = M(req);
    const birthQuery = buildBirthQuery(req.query);
    const deathQuery = buildDeathQuery(req.query);
    const [births, deaths, maleBirths, femaleBirths, csections, certIssuedB, certIssuedD] = await Promise.all([
      BirthRecord.countDocuments(birthQuery),
      DeathRecord.countDocuments(deathQuery),
      BirthRecord.countDocuments({ ...birthQuery, gender: 'male' }),
      BirthRecord.countDocuments({ ...birthQuery, gender: 'female' }),
      BirthRecord.countDocuments({ ...birthQuery, deliveryType: 'c_section' }),
      BirthRecord.countDocuments({ ...birthQuery, status: 'certificate_issued' }),
      DeathRecord.countDocuments({ ...deathQuery, status: 'certificate_issued' }),
    ]);
    res.json({
      births, deaths, maleBirths, femaleBirths, csections,
      certificatesIssued: certIssuedB + certIssuedD,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listBirthRecords,
  getBirthRecord,
  createBirthRecord,
  updateBirthRecord,
  issueBirthCertificate,
  cancelBirthRecord,
  listDeathRecords,
  getDeathRecord,
  createDeathRecord,
  updateDeathRecord,
  issueDeathCertificate,
  cancelDeathRecord,
  getVitalRecordStats,
};
