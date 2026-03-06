const BaseRadiologyOrder = require('../models/NH_RadiologyOrder');
const BaseInvoice = require('../models/NH_Invoice');
const asyncHandler = require('express-async-handler');
const { AppError } = require('../middleware/errorHandler');
const { getEffectiveModuleConfig } = require('../utils/moduleOperationsSettings');
const { getModel } = require('../utils/tenantModel');

const getModels = (req) => ({
  RadiologyOrder: getModel(req, 'RadiologyOrder', BaseRadiologyOrder),
  Invoice: getModel(req, 'Invoice', BaseInvoice),
});

// ====== CRUD ======

const getRadiologyOrders = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const { patientId, status, studyType, priority, startDate, endDate, mode } = req.query;
  const query = {};
  if (patientId) query.patient = patientId;
  if (status) query.status = status;
  if (studyType) query.studyType = studyType;
  if (priority) query.priority = priority;
  if (mode && mode !== 'all') query.mode = mode;
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const orders = await RadiologyOrder.find(query)
    .populate('patient', 'firstName lastName patientId phone')
    .populate('doctor', 'name specialization')
    .populate('orderedBy', 'firstName lastName')
    .populate('performedBy', 'firstName lastName')
    .populate('reportGeneratedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { orders, count: orders.length } });
});

const getRadiologyOrderById = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const order = await RadiologyOrder.findById(req.params.id)
    .populate('patient')
    .populate('doctor', 'name specialization')
    .populate('admission')
    .populate('orderedBy', 'firstName lastName')
    .populate('performedBy', 'firstName lastName')
    .populate('reportGeneratedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName');

  if (!order) { res.status(404); throw new Error('Radiology order not found'); }
  res.json({ success: true, data: order });
});

const createRadiologyOrder = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const { mode = 'internal', externalPatient } = req.body;
  const moduleConfig = await getEffectiveModuleConfig({ moduleKey: 'radiology', userId: req.user._id, req });

  if (!moduleConfig.enabled) {
    throw new AppError('Radiology module is disabled by settings', 403);
  }

  if (mode === 'internal' && !req.body.patient) {
    res.status(400); throw new Error('Patient is required for internal mode');
  }
  if (mode === 'internal' && !moduleConfig.integrateWithHospitalCore) {
    throw new AppError('Radiology module is configured for standalone mode only', 403);
  }
  if (mode === 'external' && !moduleConfig.runIndependently) {
    throw new AppError('Standalone radiology workflow is disabled', 403);
  }
  if (mode === 'external' && !moduleConfig.allowExternalWalkIns) {
    throw new AppError('External walk-ins are disabled for radiology', 403);
  }
  if (mode === 'external' && (!externalPatient || !externalPatient.name)) {
    res.status(400); throw new Error('External patient name is required');
  }

  const orderData = {
    ...req.body,
    orderedBy: req.user._id,
    mode,
    externalPatient: mode === 'external' ? externalPatient : undefined,
    patient: mode === 'internal' ? req.body.patient : undefined,
    doctor: req.body.doctor || undefined,
  };
  if (orderData.price && !orderData.totalAmount) {
    orderData.totalAmount = Math.max(0, orderData.price - (orderData.discount || 0));
  }
  const order = await RadiologyOrder.create(orderData);
  const populated = await RadiologyOrder.findById(order._id)
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'name');

  res.status(201).json({ success: true, data: populated });
});

const updateRadiologyOrder = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const order = await RadiologyOrder.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('patient', 'firstName lastName patientId')
    .populate('doctor', 'name');
  if (!order) { res.status(404); throw new Error('Radiology order not found'); }
  res.json({ success: true, data: order });
});

const deleteRadiologyOrder = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const order = await RadiologyOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Radiology order not found'); }
  if (order.status !== 'ordered') {
    res.status(400); throw new Error('Can only cancel orders in ordered status');
  }
  order.status = 'cancelled';
  await order.save();
  res.json({ success: true, message: 'Radiology order cancelled' });
});

// ====== WORKFLOW ======

const scheduleOrder = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const order = await RadiologyOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  order.status = 'scheduled';
  order.scheduledAt = req.body.scheduledAt || new Date();
  await order.save();
  res.json({ success: true, data: order });
});

const startStudy = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const order = await RadiologyOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  order.status = 'in_progress';
  order.performedBy = req.user._id;
  await order.save();
  res.json({ success: true, data: order });
});

const completeStudy = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const order = await RadiologyOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  order.status = 'completed';
  order.performedAt = new Date();
  order.completedAt = new Date();
  if (req.body.contrastUsed !== undefined) order.contrastUsed = req.body.contrastUsed;
  if (req.body.contrastType) order.contrastType = req.body.contrastType;
  if (req.body.notes) order.notes = req.body.notes;
  await order.save();
  res.json({ success: true, data: order });
});

// ====== REPORT ======

const createReport = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const { findings, impression, recommendation, reportNotes } = req.body;
  const order = await RadiologyOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }

  order.findings = findings;
  order.impression = impression;
  order.recommendation = recommendation;
  order.reportNotes = reportNotes;
  order.status = 'reported';
  order.reportGeneratedBy = req.user._id;
  order.reportGeneratedAt = new Date();
  await order.save();

  const populated = await RadiologyOrder.findById(order._id)
    .populate('patient', 'firstName lastName patientId dateOfBirth gender')
    .populate('doctor', 'name specialization')
    .populate('reportGeneratedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName');

  res.json({ success: true, data: populated, message: 'Report created' });
});

const verifyReport = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const order = await RadiologyOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  order.status = 'verified';
  order.verifiedBy = req.user._id;
  order.verifiedAt = new Date();
  await order.save();
  res.json({ success: true, data: order, message: 'Report verified' });
});

const deliverReport = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const order = await RadiologyOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('Order not found'); }
  order.status = 'delivered';
  await order.save();
  res.json({ success: true, data: order });
});

// ====== STATS ======

const getRadiologyStats = asyncHandler(async (req, res) => {
  const { RadiologyOrder } = getModels(req);
  const [total, pending, inProgress, completed, today] = await Promise.all([
    RadiologyOrder.countDocuments(),
    RadiologyOrder.countDocuments({ status: { $in: ['ordered', 'scheduled'] } }),
    RadiologyOrder.countDocuments({ status: 'in_progress' }),
    RadiologyOrder.countDocuments({ status: { $in: ['completed', 'reported', 'verified', 'delivered'] } }),
    RadiologyOrder.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
  ]);

  const typeStats = await RadiologyOrder.aggregate([
    { $group: { _id: '$studyType', count: { $sum: 1 } } }
  ]);

  const revenueResult = await RadiologyOrder.aggregate([
    { $match: { status: { $nin: ['cancelled'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  res.json({
    success: true,
    data: { total, pending, inProgress, completed, today, typeStats, totalRevenue: revenueResult[0]?.total || 0 }
  });
});

// ====== INVOICE ======

const generateRadiologyInvoice = asyncHandler(async (req, res) => {
  const { RadiologyOrder, Invoice } = getModels(req);
  const { orderIds } = req.body;
  const moduleConfig = await getEffectiveModuleConfig({ moduleKey: 'radiology', userId: req.user._id, req });

  if (!moduleConfig.enabled) {
    throw new AppError('Radiology module is disabled by settings', 403);
  }
  if (!orderIds || !orderIds.length) {
    res.status(400); throw new Error('Provide order IDs to generate invoice');
  }

  const orders = await RadiologyOrder.find({ _id: { $in: orderIds }, billed: false })
    .populate('patient', 'firstName lastName patientId');

  if (!orders.length) { res.status(400); throw new Error('No unbilled orders found'); }

  const mode = orders[0].mode || 'internal';
  if (!orders.every((order) => (order.mode || 'internal') === mode)) {
    res.status(400); throw new Error('All orders must belong to the same billing mode');
  }
  if (mode === 'internal') {
    const patientId = orders[0].patient?._id?.toString();
    if (!patientId || !orders.every(o => o.patient?._id?.toString() === patientId)) {
      res.status(400); throw new Error('All orders must be for the same patient');
    }
  } else {
    if (!moduleConfig.externalBillingEnabled) {
      throw new AppError('External billing is disabled for radiology', 403);
    }
    const extName = orders[0].externalPatient?.name;
    if (!extName || !orders.every(o => o.externalPatient?.name === extName)) {
      res.status(400); throw new Error('All orders must be for the same external patient');
    }
  }

  const items = orders.map(o => ({
    description: `${o.studyName} - ${o.bodyPart} (${o.orderId})`,
    category: 'radiology',
    quantity: 1,
    unitPrice: o.price,
    discount: o.discount || 0,
    tax: 0,
    amount: o.totalAmount
  }));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);

  const invoiceData = {
    type: 'radiology',
    sourceModule: 'radiology',
    items,
    subtotal,
    totalAmount: subtotal,
    dueAmount: subtotal,
    dueDate: new Date(Date.now() + 30 * 86400000),
    generatedBy: req.user._id
  };

  if (mode === 'internal') {
    invoiceData.patient = orders[0].patient._id;
    invoiceData.admission = orders[0].admission;
    invoiceData.billingScope = 'internal';
  } else {
    invoiceData.billingScope = 'external';
    invoiceData.externalPatientInfo = {
      name: orders[0].externalPatient?.name || 'Walk-in',
      age: orders[0].externalPatient?.age,
      gender: orders[0].externalPatient?.gender,
      phone: orders[0].externalPatient?.phone,
      address: orders[0].externalPatient?.address,
      referredBy: orders[0].externalPatient?.referredBy
    };
  }

  const invoice = await Invoice.create(invoiceData);

  await RadiologyOrder.updateMany(
    { _id: { $in: orderIds } },
    { billed: true, invoiceId: invoice._id }
  );

  res.status(201).json({ success: true, data: invoice, message: 'Radiology invoice generated' });
});

module.exports = {
  getRadiologyOrders,
  getRadiologyOrderById,
  createRadiologyOrder,
  updateRadiologyOrder,
  deleteRadiologyOrder,
  scheduleOrder,
  startStudy,
  completeStudy,
  createReport,
  verifyReport,
  deliverReport,
  getRadiologyStats,
  generateRadiologyInvoice
};
