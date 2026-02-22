const Invoice = require('../models/NH_Invoice');
const Patient = require('../models/NH_Patient');
const Admission = require('../models/NH_Admission');
const asyncHandler = require('express-async-handler');

const getComputedInvoiceStatus = (invoice) => {
  if (!invoice) return 'pending';
  if (invoice.status === 'cancelled' || invoice.status === 'refunded') return invoice.status;

  const totalAmount = Number(invoice.totalAmount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const dueAmount = Math.max(0, totalAmount - paidAmount);
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const isOverdue = dueAmount > 0 && dueDate && new Date() > dueDate;

  if (dueAmount <= 0) return 'paid';
  if (paidAmount > 0) return 'partial';
  if (isOverdue) return 'overdue';
  return 'pending';
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = asyncHandler(async (req, res) => {
  const { patientId, status, startDate, endDate, type } = req.query;
  const query = {};

  if (patientId) query.patient = patientId;
  if (type) query.type = type;
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const invoices = await Invoice.find(query)
    .populate('patient', 'firstName lastName patientId phone registrationType status')
    .populate('admission', 'admissionId status admissionType')
    .populate('generatedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
  
  // Format response with properly structured patient data
  const formattedInvoices = invoices.map(invoice => {
    const invoiceObj = invoice.toObject();
    if (invoiceObj.patient) {
      invoiceObj.patient.name = `${invoiceObj.patient.firstName} ${invoiceObj.patient.lastName}`;
    }
    invoiceObj.dueAmount = Math.max(0, Number(invoiceObj.totalAmount || 0) - Number(invoiceObj.paidAmount || 0));
    invoiceObj.status = getComputedInvoiceStatus(invoiceObj);
    return invoiceObj;
  });

  const response = status
    ? formattedInvoices.filter((invoice) => invoice.status === status)
    : formattedInvoices;

  res.json(response);
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
  const validTypes = ['opd', 'ipd', 'pharmacy', 'lab', 'radiology', 'ot', 'other'];
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
    totalAmount,
    addOtherItem
  } = req.body;

  const invoice = await Invoice.findById(req.params.id);

  if (invoice) {
    invoice.status = status || invoice.status;
    invoice.notes = notes || invoice.notes;
    invoice.dueDate = dueDate || invoice.dueDate;
    
    if (items) {
      invoice.items = items;
    }

    if (addOtherItem) {
      const { name, price, description } = addOtherItem;
      if (price !== undefined) {
        invoice.items.push({
          description: description || name || 'Other Charge',
          category: 'other',
          quantity: 1,
          unitPrice: Number(price),
          amount: Number(price),
          discount: 0,
          tax: 0
        });
      }
    }

    if ((items || addOtherItem) && subtotal === undefined && totalAmount === undefined) {
      invoice.subtotal = invoice.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      invoice.totalAmount = invoice.subtotal + (invoice.totalTax || 0) - (invoice.discountAmount || 0);
    } else {
      if (subtotal !== undefined) invoice.subtotal = subtotal;
      if (totalAmount !== undefined) invoice.totalAmount = totalAmount;
    }

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

    // Always validate against computed due to avoid stale status issues
    const currentDueAmount = Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0));
    invoice.dueAmount = currentDueAmount;

    // Prevent payment if invoice is already fully paid or cancelled/refunded
    if (currentDueAmount <= 0) {
      res.status(400);
      throw new Error('Invoice is already fully paid');
    }

    if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
      res.status(400);
      throw new Error(`Cannot add payment to ${invoice.status} invoice`);
    }

    // Check if payment amount exceeds remaining due amount
    if (amount > currentDueAmount) {
      res.status(400);
      throw new Error(`Payment amount (${amount}) exceeds due amount (${currentDueAmount})`);
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
