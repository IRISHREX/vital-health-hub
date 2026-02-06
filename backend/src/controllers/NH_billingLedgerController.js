const { BillingLedger, Invoice, Admission, Patient } = require('../models');
const { AppError } = require('../middleware/errorHandler');

const attachEntriesToInvoice = async (invoice, entries) => {
  if (!invoice || !entries.length) return 0;

  entries.forEach((entry) => {
    invoice.items.push({
      description: entry.description,
      category: entry.category,
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      discount: 0,
      tax: 0,
      amount: entry.amount
    });
  });

  invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  invoice.totalAmount = invoice.subtotal + invoice.totalTax - invoice.discountAmount;
  invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;

  await invoice.save();

  const entryIds = entries.map((e) => e._id);
  await BillingLedger.updateMany(
    { _id: { $in: entryIds } },
    { billed: true, billedAt: new Date(), invoice: invoice._id }
  );

  return entries.length;
};

// @desc    Create manual ledger entry
// @route   POST /api/billing/ledger
// @access  Private
exports.createLedgerEntry = async (req, res, next) => {
  try {
    const {
      admissionId,
      patientId,
      sourceType = 'manual',
      sourceId,
      category,
      description,
      quantity = 1,
      unitPrice,
      amount,
      autoAttachInvoice = true
    } = req.body;

    if (!patientId && !admissionId) {
      throw new AppError('patientId or admissionId is required', 400);
    }
    if (!category || !description || unitPrice === undefined) {
      throw new AppError('category, description, and unitPrice are required', 400);
    }

    let admission = null;
    let patient = null;

    if (admissionId) {
      admission = await Admission.findById(admissionId);
      if (!admission) throw new AppError('Admission not found', 404);
      patient = await Patient.findById(admission.patient);
    } else if (patientId) {
      patient = await Patient.findById(patientId);
    }

    if (!patient) throw new AppError('Patient not found', 404);

    const finalAmount = amount !== undefined ? amount : quantity * unitPrice;

    const entry = await BillingLedger.create({
      admission: admission?._id,
      patient: patient._id,
      sourceType,
      sourceId,
      category,
      description,
      quantity,
      unitPrice,
      amount: finalAmount,
      recordedBy: req.user._id
    });

    if (autoAttachInvoice && admission) {
      const invoice = await Invoice.findOne({
        admission: admission._id,
        status: { $in: ['draft', 'pending'] }
      });
      if (invoice) {
        await attachEntriesToInvoice(invoice, [entry]);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Ledger entry created',
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ledger entries
// @route   GET /api/billing/ledger
// @access  Private
exports.getLedgerEntries = async (req, res, next) => {
  try {
    const { admissionId, patientId, billed, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (admissionId) query.admission = admissionId;
    if (patientId) query.patient = patientId;
    if (billed !== undefined) query.billed = billed === 'true';

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await BillingLedger.countDocuments(query);
    const entries = await BillingLedger.find(query)
      .populate('patient', 'firstName lastName patientId')
      .populate('admission', 'admissionId')
      .populate('invoice', 'invoiceNumber status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: {
        entries,
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

// @desc    Generate provisional invoice from ledger
// @route   POST /api/billing/ledger/generate-invoice
// @access  Private
exports.generateProvisionalInvoice = async (req, res, next) => {
  try {
    const { admissionId } = req.body;
    if (!admissionId) {
      throw new AppError('admissionId is required', 400);
    }

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      throw new AppError('Admission not found', 404);
    }

    const patient = await Patient.findById(admission.patient);
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    let invoice = await Invoice.findOne({
      admission: admissionId,
      status: { $in: ['draft', 'pending'] }
    });

    if (!invoice) {
      invoice = new Invoice({
        patient: patient._id,
        admission: admission._id,
        type: 'ipd',
        status: 'draft',
        items: [],
        subtotal: 0,
        discountAmount: 0,
        totalTax: 0,
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `Provisional invoice generated from ledger - ${admission.admissionId}`,
        generatedBy: req.user._id
      });
      await invoice.save();
    }

    const unbilledEntries = await BillingLedger.find({ admission: admissionId, billed: false });
    const attachedCount = await attachEntriesToInvoice(invoice, unbilledEntries);

    res.json({
      success: true,
      message: 'Provisional invoice generated',
      data: {
        invoice,
        attachedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.attachEntriesToInvoice = attachEntriesToInvoice;
