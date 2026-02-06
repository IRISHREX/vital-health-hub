const { ServiceOrder, Admission, Patient, Facility, BillingLedger, Invoice } = require('../models');
const { AppError } = require('../middleware/errorHandler');

const typeToCategory = {
  lab: 'lab_test',
  radiology: 'radiology',
  procedure: 'procedure',
  surgery: 'surgery',
  physiotherapy: 'procedure',
  other: 'other'
};

const buildDescription = ({ serviceName, facilityName, type }) => {
  const base = serviceName || `${type} service`;
  return facilityName ? `${base} (${facilityName})` : base;
};

const attachLedgerToInvoice = async (ledgerEntry, admissionId) => {
  const invoice = await Invoice.findOne({
    admission: admissionId,
    status: { $in: ['draft', 'pending'] }
  });

  if (!invoice) return false;

  invoice.items.push({
    description: ledgerEntry.description,
    category: ledgerEntry.category,
    quantity: ledgerEntry.quantity,
    unitPrice: ledgerEntry.unitPrice,
    discount: 0,
    tax: 0,
    amount: ledgerEntry.amount
  });

  invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  invoice.totalAmount = invoice.subtotal + invoice.totalTax - invoice.discountAmount;
  invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;

  await invoice.save();

  ledgerEntry.billed = true;
  ledgerEntry.billedAt = new Date();
  ledgerEntry.invoice = invoice._id;
  await ledgerEntry.save();

  return true;
};

// @desc    Create service order
// @route   POST /api/service-orders
// @access  Private
exports.createServiceOrder = async (req, res, next) => {
  try {
    const {
      admissionId,
      patientId,
      facilityId,
      serviceId,
      type = 'other',
      quantity = 1,
      unitPrice,
      notes
    } = req.body;

    if (!admissionId) throw new AppError('admissionId is required', 400);

    const admission = await Admission.findById(admissionId);
    if (!admission) throw new AppError('Admission not found', 404);

    const patient = patientId
      ? await Patient.findById(patientId)
      : await Patient.findById(admission.patient);
    if (!patient) throw new AppError('Patient not found', 404);

    let facility = null;
    let serviceSnapshot = {};
    let finalUnitPrice = unitPrice;

    if (facilityId) {
      facility = await Facility.findById(facilityId);
      if (!facility) throw new AppError('Facility not found', 404);
    }

    if (serviceId && facility) {
      const service = facility.services.id(serviceId);
      if (!service) throw new AppError('Service not found in facility', 404);
      serviceSnapshot = {
        id: service._id,
        name: service.name,
        price: service.price,
        duration: service.duration
      };
      if (finalUnitPrice === undefined) finalUnitPrice = service.price;
    }

    if (finalUnitPrice === undefined) {
      throw new AppError('unitPrice is required when service price is not available', 400);
    }

    const totalAmount = quantity * finalUnitPrice;

    const order = await ServiceOrder.create({
      admission: admission._id,
      patient: patient._id,
      facility: facility?._id,
      service: serviceSnapshot,
      type,
      orderedBy: req.user._id,
      quantity,
      unitPrice: finalUnitPrice,
      totalAmount,
      notes
    });

    const populated = await ServiceOrder.findById(order._id)
      .populate('patient', 'firstName lastName patientId')
      .populate('facility', 'name type');

    res.status(201).json({
      success: true,
      message: 'Service order created',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get service orders
// @route   GET /api/service-orders
// @access  Private
exports.getServiceOrders = async (req, res, next) => {
  try {
    const { admissionId, patientId, status, type, page = 1, limit = 20 } = req.query;
    const query = {};

    if (admissionId) query.admission = admissionId;
    if (patientId) query.patient = patientId;
    if (status) query.status = status;
    if (type) query.type = type;

    const total = await ServiceOrder.countDocuments(query);
    const orders = await ServiceOrder.find(query)
      .populate('patient', 'firstName lastName patientId')
      .populate('facility', 'name type')
      .populate('orderedBy', 'firstName lastName')
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service order
// @route   PATCH /api/service-orders/:id
// @access  Private
exports.updateServiceOrder = async (req, res, next) => {
  try {
    const { status, result, notes, performedBy } = req.body;
    const order = await ServiceOrder.findById(req.params.id);

    if (!order) throw new AppError('Service order not found', 404);

    if (status) order.status = status;
    if (result !== undefined) order.result = result;
    if (notes !== undefined) order.notes = notes;
    if (performedBy) order.performedBy = performedBy;

    if (status === 'completed' && !order.performedAt) {
      order.performedAt = new Date();
    }

    await order.save();

    let ledgerEntry = null;
    if (order.status === 'completed' && order.billable && !order.billed) {
      const facility = order.facility
        ? await Facility.findById(order.facility).select('name')
        : null;
      const category = typeToCategory[order.type] || 'other';
      const description = buildDescription({
        serviceName: order.service?.name,
        facilityName: facility?.name,
        type: order.type
      });

      ledgerEntry = await BillingLedger.create({
        admission: order.admission,
        patient: order.patient,
        sourceType: 'service_order',
        sourceId: order._id,
        category,
        description,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        amount: order.totalAmount,
        recordedBy: req.user._id
      });

      await attachLedgerToInvoice(ledgerEntry, order.admission);
      order.billed = true;
      await order.save();
    }

    const populated = await ServiceOrder.findById(order._id)
      .populate('patient', 'firstName lastName patientId')
      .populate('facility', 'name type')
      .populate('orderedBy', 'firstName lastName')
      .populate('performedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Service order updated',
      data: { order: populated, ledgerEntry }
    });
  } catch (error) {
    next(error);
  }
};
