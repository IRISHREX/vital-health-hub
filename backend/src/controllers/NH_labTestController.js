const BaseLabTest = require('../models/NH_LabTest');
const BaseLabTestCatalog = require('../models/NH_LabTestCatalog');
const BasePatient = require('../models/NH_Patient');
const BaseInvoice = require('../models/NH_Invoice');
const asyncHandler = require('express-async-handler');
const { AppError } = require('../middleware/errorHandler');
const { getEffectiveModuleConfig } = require('../utils/moduleOperationsSettings');
const { getModel } = require('../utils/tenantModel');

const getModels = (req) => ({
  LabTest: getModel(req, 'LabTest', BaseLabTest),
  LabTestCatalog: getModel(req, 'LabTestCatalog', BaseLabTestCatalog),
  Patient: getModel(req, 'Patient', BasePatient),
  Invoice: getModel(req, 'Invoice', BaseInvoice),
});

const generateUniqueSampleId = async (LabTest) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const rand = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    const sampleId = `SMP${yy}${mm}${dd}${hh}${min}${sec}${ms}${rand}`;
    const exists = await LabTest.exists({ sampleId });
    if (!exists) return sampleId;
  }
  throw new Error('Unable to generate unique sample ID');
};

// Helper: Build empty result structure from catalog sections
const buildSectionsFromCatalog = (catalogItem) => {
  if (catalogItem.sections && catalogItem.sections.length > 0) {
    return catalogItem.sections.map(section => ({
      sectionName: section.sectionName,
      tests: (section.tests || []).map(test => ({
        testName: test.testName,
        testCode: test.testCode || '',
        price: test.price || 0,
        parameters: (test.parameters || []).map(param => ({
          name: param.name,
          unit: param.unit || '',
          referenceRange: param.referenceRange || null,
          value: '',
          status: 'pending',
          subParameters: (param.subParameters || []).map(sp => ({
            name: sp.name,
            unit: sp.unit || '',
            referenceRange: sp.referenceRange || null,
            value: '',
            status: 'pending'
          }))
        }))
      }))
    }));
  }
  return [];
};

// Helper: Build legacy flat parameters from catalog (backward compat)
const buildFlatParamsFromCatalog = (catalogItem) => {
  if (catalogItem.parameters && catalogItem.parameters.length > 0) {
    return catalogItem.parameters.map(p => ({
      name: p.name,
      unit: p.unit,
      normalRange: p.normalRange,
      referenceRange: p.referenceRange || null,
      value: '',
      status: 'pending',
      subParameters: []
    }));
  }
  return [];
};

// ====== CATALOG ======

const getCatalog = asyncHandler(async (req, res) => {
  const { LabTestCatalog } = getModels(req);
  const { category, search, active } = req.query;
  const query = {};
  if (category) query.category = category;
  if (active !== undefined) query.isActive = active === 'true';
  if (search) query.$text = { $search: search };

  const catalog = await LabTestCatalog.find(query).sort({ testName: 1 });
  res.json({ success: true, data: { tests: catalog, count: catalog.length } });
});

const getCatalogItem = asyncHandler(async (req, res) => {
  const { LabTestCatalog } = getModels(req);
  const item = await LabTestCatalog.findById(req.params.id);
  if (!item) { res.status(404); throw new Error('Test not found in catalog'); }
  res.json({ success: true, data: item });
});

const createCatalogItem = asyncHandler(async (req, res) => {
  const { LabTestCatalog } = getModels(req);
  const item = await LabTestCatalog.create(req.body);
  res.status(201).json({ success: true, data: item });
});

const updateCatalogItem = asyncHandler(async (req, res) => {
  const { LabTestCatalog } = getModels(req);
  const item = await LabTestCatalog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) { res.status(404); throw new Error('Test not found in catalog'); }
  res.json({ success: true, data: item });
});

const deleteCatalogItem = asyncHandler(async (req, res) => {
  const { LabTestCatalog } = getModels(req);
  const item = await LabTestCatalog.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!item) { res.status(404); throw new Error('Test not found in catalog'); }
  res.json({ success: true, message: 'Test deactivated' });
});

// ====== LAB TESTS (Orders) ======

const getLabTests = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const { patientId, status, category, priority, startDate, endDate, sampleStatus, mode } = req.query;
  const query = {};
  if (patientId) query.patient = patientId;
  if (status) query.status = status;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (sampleStatus) query.sampleStatus = sampleStatus;
  if (mode && mode !== 'all') query.mode = mode;
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const tests = await LabTest.find(query)
    .populate('patient', 'firstName lastName patientId phone gender dateOfBirth')
    .populate('doctor', 'name specialization')
    .populate('orderedBy', 'firstName lastName')
    .populate('sampleCollectedBy', 'firstName lastName')
    .populate('reportGeneratedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { tests, count: tests.length } });
});

const getLabTestById = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findById(req.params.id)
    .populate('patient')
    .populate('doctor', 'name specialization')
    .populate('admission')
    .populate('appointment')
    .populate('orderedBy', 'firstName lastName')
    .populate('sampleCollectedBy', 'firstName lastName')
    .populate('reportGeneratedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName');

  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  res.json({ success: true, data: test });
});

const createLabTest = asyncHandler(async (req, res) => {
  const { LabTest, LabTestCatalog } = getModels(req);
  const { catalogTestId, catalogTestIds, mode = 'internal', externalPatient } = req.body;
  const moduleConfig = await getEffectiveModuleConfig({ moduleKey: 'pathology', userId: req.user._id });

  if (!moduleConfig.enabled) {
    throw new AppError('Pathology module is disabled by settings', 403);
  }

  // Validate based on mode
  if (mode === 'internal' && !req.body.patient) {
    res.status(400); throw new Error('Patient is required for internal mode');
  }
  if (mode === 'internal' && !moduleConfig.integrateWithHospitalCore) {
    throw new AppError('Pathology module is configured for standalone mode only', 403);
  }
  if (mode === 'external' && !moduleConfig.runIndependently) {
    throw new AppError('Standalone pathology workflow is disabled', 403);
  }
  if (mode === 'external' && !moduleConfig.allowExternalWalkIns) {
    throw new AppError('External walk-ins are disabled for pathology lab', 403);
  }
  if (mode === 'external' && (!externalPatient || !externalPatient.name)) {
    res.status(400); throw new Error('External patient name is required');
  }

  const selectedCatalogIds = Array.isArray(catalogTestIds) && catalogTestIds.length
    ? catalogTestIds
    : (catalogTestId ? [catalogTestId] : []);

  if (selectedCatalogIds.length > 0) {
    const catalogItems = await LabTestCatalog.find({ _id: { $in: selectedCatalogIds } });
    if (catalogItems.length !== selectedCatalogIds.length) {
      res.status(404);
      throw new Error('One or more catalog tests not found');
    }

    const sharedData = {
      ...req.body,
      orderedBy: req.user._id,
      mode,
      externalPatient: mode === 'external' ? externalPatient : undefined,
      patient: mode === 'internal' ? req.body.patient : undefined,
      doctor: req.body.doctor || undefined,
    };

    const testsToCreate = selectedCatalogIds.map((id) => {
      const catalogItem = catalogItems.find((item) => item._id.toString() === id.toString());
      return {
        ...sharedData,
        testName: catalogItem.testName,
        testCode: catalogItem.testCode,
        category: catalogItem.category,
        description: catalogItem.description,
        sampleType: catalogItem.sampleType,
        sections: buildSectionsFromCatalog(catalogItem),
        parameters: buildFlatParamsFromCatalog(catalogItem),
        price: catalogItem.price,
        totalAmount: Math.max(0, catalogItem.price - (req.body.discount || 0)),
        expectedCompletionAt: new Date(Date.now() + catalogItem.turnaroundTime * 3600000)
      };
    });

    const createdTests = await LabTest.insertMany(testsToCreate);
    const createdIds = createdTests.map((t) => t._id);
    const populatedTests = await LabTest.find({ _id: { $in: createdIds } })
      .populate('patient', 'firstName lastName patientId gender dateOfBirth')
      .populate('doctor', 'name');

    if (populatedTests.length === 1) {
      res.status(201).json({ success: true, data: populatedTests[0] });
      return;
    }

    res.status(201).json({
      success: true,
      data: { tests: populatedTests, count: populatedTests.length },
      message: `${populatedTests.length} lab tests ordered successfully`
    });
    return;
  }

  const testData = {
    ...req.body,
    orderedBy: req.user._id,
    mode,
    externalPatient: mode === 'external' ? externalPatient : undefined,
    patient: mode === 'internal' ? req.body.patient : undefined,
    doctor: req.body.doctor || undefined,
  };
  const test = await LabTest.create(testData);
  const populated = await LabTest.findById(test._id)
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'name');

  res.status(201).json({ success: true, data: populated });
});

const updateLabTest = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'name');
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  res.json({ success: true, data: test });
});

const deleteLabTest = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  if (test.status !== 'ordered') {
    res.status(400);
    throw new Error('Can only cancel tests in ordered status');
  }
  test.status = 'cancelled';
  await test.save();
  res.json({ success: true, message: 'Lab test cancelled' });
});

// ====== SAMPLE WORKFLOW ======

const collectSample = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }

  if (test.sampleStatus === 'collected' || test.sampleStatus === 'received' || test.sampleStatus === 'processing') {
    res.json({ success: true, data: test, message: 'Sample already collected' });
    return;
  }

  test.sampleStatus = 'collected';
  test.sampleCollectedAt = new Date();
  test.sampleCollectedBy = req.user._id;
  test.status = 'sample_collected';
  if (!test.sampleId) {
    test.sampleId = await generateUniqueSampleId(LabTest);
  }

  await test.save();
  res.json({ success: true, data: test, message: 'Sample collected successfully' });
});

const receiveSample = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  test.sampleStatus = 'received';
  await test.save();
  res.json({ success: true, data: test });
});

const rejectSample = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  test.sampleStatus = 'rejected';
  test.sampleRejectionReason = req.body.reason || 'Sample quality issue';
  await test.save();
  res.json({ success: true, data: test });
});

const startProcessing = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  if (!['collected', 'received', 'processing'].includes(test.sampleStatus)) {
    res.status(400);
    throw new Error('Collect sample first before starting processing');
  }
  test.sampleStatus = 'processing';
  test.status = 'processing';
  await test.save();
  res.json({ success: true, data: test });
});

// ====== RESULTS ======

const enterResults = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const { sections, parameters, interpretation, remarks } = req.body;
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }

  if (sections) test.sections = sections;
  if (parameters) test.parameters = parameters;
  if (interpretation) test.interpretation = interpretation;
  if (remarks) test.remarks = remarks;
  test.status = 'completed';
  test.completedAt = new Date();
  test.reportGeneratedBy = req.user._id;
  test.reportGeneratedAt = new Date();

  await test.save();
  const populated = await LabTest.findById(test._id)
    .populate('patient', 'firstName lastName patientId dateOfBirth gender')
    .populate('doctor', 'name specialization')
    .populate('reportGeneratedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName');

  res.json({ success: true, data: populated, message: 'Results entered successfully' });
});

const verifyResults = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  test.status = 'verified';
  test.verifiedBy = req.user._id;
  test.verifiedAt = new Date();
  await test.save();
  res.json({ success: true, data: test, message: 'Results verified' });
});

const deliverReport = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  test.status = 'delivered';
  await test.save();
  res.json({ success: true, data: test });
});

// ====== STATS ======

const getLabStats = asyncHandler(async (req, res) => {
  const { LabTest } = getModels(req);
  const [total, pending, processing, completed, today] = await Promise.all([
    LabTest.countDocuments(),
    LabTest.countDocuments({ status: { $in: ['ordered', 'sample_collected'] } }),
    LabTest.countDocuments({ status: 'processing' }),
    LabTest.countDocuments({ status: { $in: ['completed', 'verified', 'delivered'] } }),
    LabTest.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    })
  ]);

  const categoryStats = await LabTest.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const revenueResult = await LabTest.aggregate([
    { $match: { status: { $nin: ['cancelled'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  res.json({
    success: true,
    data: {
      total, pending, processing, completed, today, categoryStats,
      totalRevenue: revenueResult[0]?.total || 0
    }
  });
});

// ====== GENERATE INVOICE ======

const generateLabInvoice = asyncHandler(async (req, res) => {
  const { LabTest, Invoice } = getModels(req);
  const { testIds } = req.body;
  const moduleConfig = await getEffectiveModuleConfig({ moduleKey: 'pathology', userId: req.user._id });

  if (!moduleConfig.enabled) {
    throw new AppError('Pathology module is disabled by settings', 403);
  }
  if (!testIds || !testIds.length) {
    res.status(400);
    throw new Error('Provide test IDs to generate invoice');
  }

  const tests = await LabTest.find({ _id: { $in: testIds }, billed: false })
    .populate('patient', 'firstName lastName patientId');

  if (!tests.length) {
    res.status(400);
    throw new Error('No unbilled tests found');
  }

  // Determine if external or internal
  const mode = tests[0].mode || 'internal';
  if (!tests.every((test) => (test.mode || 'internal') === mode)) {
    res.status(400);
    throw new Error('All tests must belong to the same billing mode');
  }

  // Verify all tests belong to same patient/external patient
  if (mode === 'internal') {
    const patientId = tests[0].patient?._id?.toString();
    if (!tests.every(t => t.patient?._id?.toString() === patientId)) {
      res.status(400);
      throw new Error('All tests must be for the same patient');
    }
  } else {
    const extName = tests[0].externalPatient?.name;
    if (!tests.every(t => t.externalPatient?.name === extName)) {
      res.status(400);
      throw new Error('All tests must be for the same external patient');
    }
  }

  const items = tests.map(t => ({
    description: `${t.testName} (${t.testCode})`,
    category: 'lab_test',
    quantity: 1,
    unitPrice: t.price,
    discount: t.discount || 0,
    tax: 0,
    amount: t.totalAmount
  }));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);

  const invoiceData = {
    type: 'lab',
    sourceModule: 'pathology',
    items,
    subtotal,
    totalAmount: subtotal,
    dueAmount: subtotal,
    dueDate: new Date(Date.now() + 30 * 86400000),
    generatedBy: req.user._id,
    notes: mode === 'external' ? `External Patient: ${tests[0].externalPatient?.name || 'Walk-in'}` : undefined
  };

  if (mode === 'internal') {
    invoiceData.patient = tests[0].patient._id;
    invoiceData.admission = tests[0].admission;
    invoiceData.billingScope = 'internal';
  } else {
    if (!moduleConfig.externalBillingEnabled) {
      throw new AppError('External billing is disabled for pathology lab', 403);
    }
    invoiceData.billingScope = 'external';
    invoiceData.externalPatientInfo = {
      name: tests[0].externalPatient?.name || 'Walk-in',
      age: tests[0].externalPatient?.age,
      gender: tests[0].externalPatient?.gender,
      phone: tests[0].externalPatient?.phone,
      address: tests[0].externalPatient?.address,
      referredBy: tests[0].externalPatient?.referredBy
    };
  }

  const invoice = await Invoice.create(invoiceData);

  await LabTest.updateMany(
    { _id: { $in: testIds } },
    { billed: true, invoiceId: invoice._id }
  );

  res.status(201).json({ success: true, data: invoice, message: 'Lab invoice generated' });
});

module.exports = {
  getCatalog, getCatalogItem, createCatalogItem, updateCatalogItem, deleteCatalogItem,
  getLabTests, getLabTestById, createLabTest, updateLabTest, deleteLabTest,
  collectSample, receiveSample, rejectSample, startProcessing,
  enterResults, verifyResults, deliverReport,
  getLabStats, generateLabInvoice
};
