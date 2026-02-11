const LabTest = require('../models/NH_LabTest');
const LabTestCatalog = require('../models/NH_LabTestCatalog');
const Patient = require('../models/NH_Patient');
const Invoice = require('../models/NH_Invoice');
const asyncHandler = require('express-async-handler');

const generateUniqueSampleId = async () => {
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

// ====== CATALOG ======

const getCatalog = asyncHandler(async (req, res) => {
  const { category, search, active } = req.query;
  const query = {};
  if (category) query.category = category;
  if (active !== undefined) query.isActive = active === 'true';
  if (search) query.$text = { $search: search };

  const catalog = await LabTestCatalog.find(query).sort({ testName: 1 });
  res.json({ success: true, data: { tests: catalog, count: catalog.length } });
});

const getCatalogItem = asyncHandler(async (req, res) => {
  const item = await LabTestCatalog.findById(req.params.id);
  if (!item) { res.status(404); throw new Error('Test not found in catalog'); }
  res.json({ success: true, data: item });
});

const createCatalogItem = asyncHandler(async (req, res) => {
  const item = await LabTestCatalog.create(req.body);
  res.status(201).json({ success: true, data: item });
});

const updateCatalogItem = asyncHandler(async (req, res) => {
  const item = await LabTestCatalog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) { res.status(404); throw new Error('Test not found in catalog'); }
  res.json({ success: true, data: item });
});

const deleteCatalogItem = asyncHandler(async (req, res) => {
  const item = await LabTestCatalog.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!item) { res.status(404); throw new Error('Test not found in catalog'); }
  res.json({ success: true, message: 'Test deactivated' });
});

// ====== LAB TESTS (Orders) ======

const getLabTests = asyncHandler(async (req, res) => {
  const { patientId, status, category, priority, startDate, endDate, sampleStatus } = req.query;
  const query = {};
  if (patientId) query.patient = patientId;
  if (status) query.status = status;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (sampleStatus) query.sampleStatus = sampleStatus;
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const tests = await LabTest.find(query)
    .populate('patient', 'firstName lastName patientId phone')
    .populate('doctor', 'name specialization')
    .populate('orderedBy', 'firstName lastName')
    .populate('sampleCollectedBy', 'firstName lastName')
    .populate('reportGeneratedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { tests, count: tests.length } });
});

const getLabTestById = asyncHandler(async (req, res) => {
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
  const { catalogTestId, catalogTestIds } = req.body;

  // If catalog test IDs provided, create one lab test record per selected catalog test
  const selectedCatalogIds = Array.isArray(catalogTestIds) && catalogTestIds.length
    ? catalogTestIds
    : (catalogTestId ? [catalogTestId] : []);

  if (selectedCatalogIds.length > 0) {
    const catalogItems = await LabTestCatalog.find({ _id: { $in: selectedCatalogIds } });
    if (catalogItems.length !== selectedCatalogIds.length) {
      res.status(404);
      throw new Error('One or more catalog tests not found');
    }

    const sharedData = { ...req.body, orderedBy: req.user._id };

    const testsToCreate = selectedCatalogIds.map((id) => {
      const catalogItem = catalogItems.find((item) => item._id.toString() === id.toString());
      return {
        ...sharedData,
        testName: catalogItem.testName,
        testCode: catalogItem.testCode,
        category: catalogItem.category,
        description: catalogItem.description,
        sampleType: catalogItem.sampleType,
        parameters: catalogItem.parameters.map(p => ({
          name: p.name,
          unit: p.unit,
          normalRange: p.normalRange,
          value: '',
          status: 'pending'
        })),
        price: catalogItem.price,
        totalAmount: Math.max(0, catalogItem.price - (req.body.discount || 0)),
        expectedCompletionAt: new Date(Date.now() + catalogItem.turnaroundTime * 3600000)
      };
    });

    const createdTests = await LabTest.insertMany(testsToCreate);
    const createdIds = createdTests.map((t) => t._id);
    const populatedTests = await LabTest.find({ _id: { $in: createdIds } })
      .populate('patient', 'firstName lastName patientId')
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

  // Fallback: create a direct manual test order payload
  const testData = { ...req.body, orderedBy: req.user._id };
  const test = await LabTest.create(testData);
  const populated = await LabTest.findById(test._id)
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'name');

  res.status(201).json({ success: true, data: populated });
});

const updateLabTest = asyncHandler(async (req, res) => {
  const test = await LabTest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'name');
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  res.json({ success: true, data: test });
});

const deleteLabTest = asyncHandler(async (req, res) => {
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
    test.sampleId = await generateUniqueSampleId();
  }

  await test.save();
  res.json({ success: true, data: test, message: 'Sample collected successfully' });
});

const receiveSample = asyncHandler(async (req, res) => {
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  test.sampleStatus = 'received';
  await test.save();
  res.json({ success: true, data: test });
});

const rejectSample = asyncHandler(async (req, res) => {
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  test.sampleStatus = 'rejected';
  test.sampleRejectionReason = req.body.reason || 'Sample quality issue';
  await test.save();
  res.json({ success: true, data: test });
});

const startProcessing = asyncHandler(async (req, res) => {
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
  const { parameters, interpretation, remarks } = req.body;
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }

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
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  test.status = 'verified';
  test.verifiedBy = req.user._id;
  test.verifiedAt = new Date();
  await test.save();
  res.json({ success: true, data: test, message: 'Results verified' });
});

const deliverReport = asyncHandler(async (req, res) => {
  const test = await LabTest.findById(req.params.id);
  if (!test) { res.status(404); throw new Error('Lab test not found'); }
  test.status = 'delivered';
  await test.save();
  res.json({ success: true, data: test });
});

// ====== STATS ======

const getLabStats = asyncHandler(async (req, res) => {
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
      total,
      pending,
      processing,
      completed,
      today,
      categoryStats,
      totalRevenue: revenueResult[0]?.total || 0
    }
  });
});

// ====== GENERATE INVOICE ======

const generateLabInvoice = asyncHandler(async (req, res) => {
  const { testIds } = req.body;
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

  // Ensure all tests are for the same patient
  const patientId = tests[0].patient._id.toString();
  if (!tests.every(t => t.patient._id.toString() === patientId)) {
    res.status(400);
    throw new Error('All tests must be for the same patient');
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

  const invoice = await Invoice.create({
    patient: patientId,
    admission: tests[0].admission,
    type: 'lab',
    items,
    subtotal,
    totalAmount: subtotal,
    dueAmount: subtotal,
    dueDate: new Date(Date.now() + 30 * 86400000),
    generatedBy: req.user._id
  });

  // Mark tests as billed
  await LabTest.updateMany(
    { _id: { $in: testIds } },
    { billed: true, invoiceId: invoice._id }
  );

  res.status(201).json({ success: true, data: invoice, message: 'Lab invoice generated' });
});

module.exports = {
  getCatalog,
  getCatalogItem,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  getLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest,
  collectSample,
  receiveSample,
  rejectSample,
  startProcessing,
  enterResults,
  verifyResults,
  deliverReport,
  getLabStats,
  generateLabInvoice
};
