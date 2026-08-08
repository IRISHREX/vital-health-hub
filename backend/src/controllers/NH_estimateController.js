const EstimateBase = require('../models/NH_Estimate');
const ServiceCatalogBase = require('../models/NH_ServiceCatalog');
const LabTestCatalogBase = require('../models/NH_LabTestCatalog');
const MedicineBase = require('../models/NH_Medicine');
const PatientBase = require('../models/NH_Patient');
const { getModel } = require('../utils/tenantModel');
const { nextTenantSequence } = require('../utils/tenantSequence');

const M = (req) => ({
  Estimate: getModel(req, 'Estimate', EstimateBase),
  ServiceCatalog: getModel(req, 'ServiceCatalog', ServiceCatalogBase),
  LabTestCatalog: getModel(req, 'LabTestCatalog', LabTestCatalogBase),
  Medicine: getModel(req, 'Medicine', MedicineBase),
  Patient: getModel(req, 'Patient', PatientBase),
});

const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Pure: normalise items and compute money totals. */
const computeTotals = (rawItems = [], discountAmount = 0, taxAmount = 0) => {
  const items = rawItems
    .filter((it) => it && it.description)
    .map((it) => {
      const quantity = Number(it.quantity) || 1;
      const unitPrice = round2(it.unitPrice);
      return {
        module: it.module || 'other',
        description: String(it.description).trim(),
        sourceRef: it.sourceRef || undefined,
        sourceType: it.sourceType || undefined,
        quantity,
        unitPrice,
        amount: round2(quantity * unitPrice),
        notes: it.notes,
      };
    });
  const subtotal = round2(items.reduce((sum, it) => sum + it.amount, 0));
  const discount = round2(discountAmount);
  const tax = round2(taxAmount);
  return {
    items,
    subtotal,
    discountAmount: discount,
    taxAmount: tax,
    totalAmount: Math.max(0, round2(subtotal - discount + tax)),
  };
};

const listEstimates = async (req, res) => {
  try {
    const { Estimate } = M(req);
    const { status, patientId, search, from, to } = req.query;
    const query = {};
    if (status) query.status = status;
    if (patientId) query.patient = patientId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { estimateNumber: rx },
        { 'patientInfo.name': rx },
        { 'patientInfo.phone': rx },
        { 'items.description': rx },
      ];
    }
    const items = await Estimate.find(query)
      .populate('patient', 'firstName lastName patientId phone')
      .populate('doctor', 'firstName lastName specialization')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEstimate = async (req, res) => {
  try {
    const { Estimate } = M(req);
    const estimate = await Estimate.findById(req.params.id)
      .populate('patient', 'firstName lastName patientId phone gender dateOfBirth address')
      .populate('doctor', 'firstName lastName specialization')
      .populate('createdBy', 'firstName lastName role');
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createEstimate = async (req, res) => {
  try {
    const { Estimate } = M(req);
    const { items = [], discountAmount = 0, taxAmount = 0 } = req.body || {};
    if (!items.length) return res.status(400).json({ message: 'At least one estimate line is required' });
    if (!req.body.patient && !req.body.patientInfo?.name) {
      return res.status(400).json({ message: 'Select a patient or enter a patient name' });
    }
    const totals = computeTotals(items, discountAmount, taxAmount);
    const estimateNumber = await nextTenantSequence(req, 'estimate', 'EST');
    const estimate = await Estimate.create({
      ...req.body,
      ...totals,
      estimateNumber,
      createdBy: req.user._id,
    });
    res.status(201).json(estimate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const LOCKED_STATUSES = ['converted', 'cancelled'];

const updateEstimate = async (req, res) => {
  try {
    const { Estimate } = M(req);
    const estimate = await Estimate.findById(req.params.id);
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
    if (LOCKED_STATUSES.includes(estimate.status)) {
      return res.status(400).json({ message: `A ${estimate.status} estimate cannot be edited` });
    }
    const skip = ['_id', 'estimateNumber', 'createdBy', 'createdAt', 'updatedAt', 'convertedInvoice'];
    Object.entries(req.body || {}).forEach(([k, v]) => {
      if (!skip.includes(k)) estimate[k] = v;
    });
    const totals = computeTotals(
      req.body.items ?? estimate.items,
      req.body.discountAmount ?? estimate.discountAmount,
      req.body.taxAmount ?? estimate.taxAmount
    );
    Object.assign(estimate, totals);
    estimate.lastUpdatedBy = req.user._id;
    await estimate.save();
    res.json(estimate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteEstimate = async (req, res) => {
  try {
    const { Estimate } = M(req);
    const estimate = await Estimate.findById(req.params.id);
    if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
    if (estimate.status === 'converted') {
      return res.status(400).json({ message: 'A converted estimate cannot be cancelled' });
    }
    estimate.status = 'cancelled';
    estimate.lastUpdatedBy = req.user._id;
    await estimate.save();
    res.json({ success: true, estimate });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Unified searchable catalog across services, lab tests and medicines so an
 * estimate can be built by typing a test/service/medicine name.
 */
const searchCatalog = async (req, res) => {
  try {
    const { ServiceCatalog, LabTestCatalog, Medicine } = M(req);
    const { q = '', source } = req.query;
    const rx = q.trim() ? new RegExp(escapeRegex(q.trim()), 'i') : null;
    const limit = 25;
    const wanted = (key) => !source || source === 'all' || source === key;

    const [services, labTests, medicines] = await Promise.all([
      wanted('service')
        ? ServiceCatalog.find(rx ? { name: rx } : {}).select('name category price charges rate').limit(limit)
        : [],
      wanted('lab')
        ? LabTestCatalog.find({ isActive: true, ...(rx ? { testName: rx } : {}) })
            .select('testName testCode price category')
            .limit(limit)
        : [],
      wanted('pharmacy')
        ? Medicine.find(rx ? { name: rx } : {}).select('name sellingPrice mrp unitPrice category').limit(limit)
        : [],
    ]);

    const priceOf = (doc, keys) => {
      for (const k of keys) {
        const v = Number(doc?.[k]);
        if (Number.isFinite(v) && v > 0) return v;
      }
      return 0;
    };

    const items = [
      ...services.map((s) => ({
        sourceRef: s._id,
        sourceType: 'service_catalog',
        module: 'ipd',
        description: s.name,
        category: s.category || 'service',
        unitPrice: priceOf(s, ['price', 'charges', 'rate']),
      })),
      ...labTests.map((t) => ({
        sourceRef: t._id,
        sourceType: 'lab_test',
        module: 'lab',
        description: t.testName,
        category: t.category || 'lab',
        unitPrice: priceOf(t, ['price']),
      })),
      ...medicines.map((m) => ({
        sourceRef: m._id,
        sourceType: 'medicine',
        module: 'pharmacy',
        description: m.name,
        category: m.category || 'medicine',
        unitPrice: priceOf(m, ['sellingPrice', 'mrp', 'unitPrice']),
      })),
    ];

    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listEstimates,
  getEstimate,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  searchCatalog,
  computeTotals,
};
