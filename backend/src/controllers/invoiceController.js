const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');

// Create invoice
exports.createInvoice = async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    
    // Calculate totals
    invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    invoice.totalAmount = invoice.subtotal + (invoice.totalTax || 0) - (invoice.discountAmount || 0);
    invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;
    
    if (invoice.dueAmount > 0 && invoice.status === 'draft') {
      invoice.status = 'pending';
    }
    
    await invoice.save();

    // Link invoice to patient if patient exists
    if (invoice.patient) {
      await Patient.findByIdAndUpdate(invoice.patient, { invoice: invoice._id });
    }

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all invoices
exports.getInvoices = async (req, res) => {
  try {
    const { patientId, status, startDate, endDate, type } = req.query;
    const filter = {};

    if (patientId) filter.patient = patientId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter)
      .populate('patient', 'firstName lastName patientId phone email')
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        invoices,
        count: invoices.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single invoice
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('patient', 'firstName lastName patientId phone email address')
      .populate('generatedBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Prevent updates to paid/cancelled invoices
    if (['paid', 'cancelled', 'refunded'].includes(invoice.status) && !req.body.forceUpdate) {
      return res.status(400).json({
        success: false,
        message: `Cannot modify invoice with status: ${invoice.status}`
      });
    }

    Object.assign(invoice, req.body);

    // Recalculate totals
    invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    invoice.totalAmount = invoice.subtotal + (invoice.totalTax || 0) - (invoice.discountAmount || 0);
    invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;

    await invoice.save();

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Add invoice item
exports.addInvoiceItem = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot add items to invoice with status: ${invoice.status}`
      });
    }

    invoice.items.push(req.body);

    // Recalculate totals
    invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    invoice.totalAmount = invoice.subtotal + (invoice.totalTax || 0) - (invoice.discountAmount || 0);
    invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;

    if (invoice.status === 'draft') {
      invoice.status = 'pending';
    }

    await invoice.save();

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Add payment
exports.addPayment = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const { amount, method, reference } = req.body;

    if (amount > invoice.dueAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${amount}) exceeds due amount (${invoice.dueAmount})`
      });
    }

    invoice.payments.push({
      amount,
      method,
      reference,
      paidAt: new Date(),
      receivedBy: req.user?._id
    });

    invoice.paidAmount += amount;
    invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;

    // Update status
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    }

    await invoice.save();

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Unlink from patient
    if (invoice.patient) {
      await Patient.findByIdAndUpdate(invoice.patient, { $unset: { invoice: 1 } });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get invoice by patient
exports.getInvoiceByPatient = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ patient: req.params.patientId })
      .populate('patient', 'firstName lastName patientId phone email');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this patient'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
