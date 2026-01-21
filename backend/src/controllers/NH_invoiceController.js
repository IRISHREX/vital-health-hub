const Invoice = require('../models/NH_Invoice');
const Patient = require('../models/NH_Patient');
const Admission = require('../models/NH_Admission');
const asyncHandler = require('express-async-handler');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = asyncHandler(async (req, res) => {
  const { patientId, status, startDate, endDate } = req.query;
  const query = {};

  if (patientId) query.patient = patientId;
  if (status) query.status = status;
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const invoices = await Invoice.find(query)
    .populate('patient', 'firstName lastName patientId phone')
    .populate('generatedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
  
  // Format response with properly structured patient data
  const formattedInvoices = invoices.map(invoice => {
    const invoiceObj = invoice.toObject();
    if (invoiceObj.patient) {
      invoiceObj.patient.name = `${invoiceObj.patient.firstName} ${invoiceObj.patient.lastName}`;
    }
    return invoiceObj;
  });
    
  res.json(formattedInvoices);
});

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('patient')
    .populate('admission')
    .populate('generatedBy', 'name email')
    .populate('lastUpdatedBy', 'name email')
    .populate('payments.receivedBy', 'name email');

  if (invoice) {
    res.json(invoice);
  } else {
    res.status(404);
    throw new Error('Invoice not found');
  }
});

// @desc    Create an invoice
// @route   POST /api/invoices
// @access  Private/Admin
const createInvoice = asyncHandler(async (req, res) => {
  const {
    patient,
    admission,
    appointment,
    type,
    items,
    subtotal,
    discountAmount,
    discountReason,
    taxDetails,
    totalTax,
    totalAmount,
    status,
    dueDate,
    notes,
  } = req.body;

  // Validate required fields
  if (!patient || !type || !items || !items.length || !totalAmount || !dueDate) {
    res.status(400);
    throw new Error('Missing required fields: patient, type, items, totalAmount, dueDate');
  }

  // Validate that type is one of the allowed values
  const validTypes = ['opd', 'ipd', 'pharmacy', 'lab', 'other'];
  if (!validTypes.includes(type)) {
    res.status(400);
    throw new Error(`Invalid invoice type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate items
  const validCategories = ['bed_charges', 'doctor_fee', 'nursing', 'medication', 'procedure', 'lab_test', 'radiology', 'surgery', 'other'];
  items.forEach((item, index) => {
    if (!item.description || item.unitPrice === undefined || item.amount === undefined) {
      res.status(400);
      throw new Error(`Item ${index + 1}: Missing required fields (description, unitPrice, amount)`);
    }
    if (!validCategories.includes(item.category)) {
      res.status(400);
      throw new Error(`Item ${index + 1}: Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
  });

  // Calculate subtotal from items if not provided
  const calculatedSubtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const finalSubtotal = subtotal || calculatedSubtotal;

  // Calculate final amounts
  const finalDiscountAmount = discountAmount || 0;
  const finalTotalTax = totalTax || 0;
  const finalTotalAmount = totalAmount || (finalSubtotal - finalDiscountAmount + finalTotalTax);

  const invoice = new Invoice({
    patient,
    admission,
    appointment,
    type,
    items,
    subtotal: finalSubtotal,
    discountAmount: finalDiscountAmount,
    discountReason,
    taxDetails: taxDetails || {},
    totalTax: finalTotalTax,
    totalAmount: finalTotalAmount,
    paidAmount: 0,
    dueAmount: finalTotalAmount,
    status: 'pending', // Always start with pending
    dueDate,
    notes,
    generatedBy: req.user._id,
  });

  const createdInvoice = await invoice.save();
  res.status(201).json(createdInvoice);
});

// @desc    Update an invoice
// @route   PUT /api/invoices/:id
// @access  Private/Admin
const updateInvoice = asyncHandler(async (req, res) => {
  const {
    status,
    notes,
    dueDate,
    items,
    subtotal,
    totalAmount
  } = req.body;

  const invoice = await Invoice.findById(req.params.id);

  if (invoice) {
    invoice.status = status || invoice.status;
    invoice.notes = notes || invoice.notes;
    invoice.dueDate = dueDate || invoice.dueDate;
    invoice.items = items || invoice.items;
    invoice.subtotal = subtotal || invoice.subtotal;
    invoice.totalAmount = totalAmount || invoice.totalAmount;
    invoice.lastUpdatedBy = req.user._id;

    const updatedInvoice = await invoice.save();
    res.json(updatedInvoice);
  } else {
    res.status(404);
    throw new Error('Invoice not found');
  }
});

// @desc    Delete an invoice
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (invoice) {
    // Use soft delete - mark as cancelled instead of removing
    if (invoice.status === 'paid' || invoice.paidAmount > 0) {
      res.status(400);
      throw new Error('Cannot delete invoice with payments. Mark as cancelled instead.');
    }
    
    invoice.status = 'cancelled';
    invoice.lastUpdatedBy = req.user._id;
    await invoice.save();
    
    res.json({ 
      success: true,
      message: 'Invoice cancelled successfully',
      invoice
    });
  } else {
    res.status(404);
    throw new Error('Invoice not found');
  }
});

// @desc    Add payment to an invoice
// @route   POST /api/invoices/:id/payments
// @access  Private
const addPayment = asyncHandler(async (req, res) => {
    const { amount, method, reference } = req.body;

    // Validate required fields
    if (!amount || !method) {
      res.status(400);
      throw new Error('Missing required fields: amount, method');
    }

    if (amount <= 0) {
      res.status(400);
      throw new Error('Payment amount must be greater than 0');
    }

    const validMethods = ['cash', 'card', 'upi', 'net_banking', 'cheque', 'insurance'];
    if (!validMethods.includes(method)) {
      res.status(400);
      throw new Error(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      res.status(404);
      throw new Error('Invoice not found');
    }

    // Prevent payment if invoice is already paid or cancelled/refunded
    if (invoice.status === 'paid') {
      res.status(400);
      throw new Error('Invoice is already fully paid');
    }

    if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
      res.status(400);
      throw new Error(`Cannot add payment to ${invoice.status} invoice`);
    }

    // Check if payment amount exceeds remaining due amount
    if (amount > invoice.dueAmount) {
      res.status(400);
      throw new Error(`Payment amount (${amount}) exceeds due amount (${invoice.dueAmount})`);
    }

    const payment = {
        amount,
        method,
        reference: reference || '',
        receivedBy: req.user._id,
    };

    invoice.payments.push(payment);
    invoice.paidAmount += amount;
    invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;

    // Status will be automatically updated by the pre-save hook
    await invoice.save();

    res.status(201).json({
      success: true,
      message: `Payment of ₹${amount} recorded successfully`,
      invoice
    });
});


module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment
};
