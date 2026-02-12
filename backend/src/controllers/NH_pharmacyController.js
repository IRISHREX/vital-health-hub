const Medicine = require('../models/NH_Medicine');
const Prescription = require('../models/NH_Prescription');
const StockAdjustment = require('../models/NH_StockAdjustment');
const { BillingLedger, Invoice } = require('../models');
const { AppError } = require('../middleware/errorHandler');

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

const getOrCreatePharmacyInvoice = async ({ patientId, admissionId, userId }) => {
  let invoice = await Invoice.findOne({
    patient: patientId,
    admission: admissionId || null,
    type: 'pharmacy',
    status: { $in: ['draft', 'pending', 'partial', 'overdue'] }
  });

  if (invoice) return invoice;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  return Invoice.create({
    patient: patientId,
    admission: admissionId || undefined,
    type: 'pharmacy',
    items: [],
    subtotal: 0,
    discountAmount: 0,
    totalTax: 0,
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
    status: 'pending',
    dueDate,
    notes: 'Auto-generated from pharmacy dispense',
    generatedBy: userId
  });
};

const recalculateInvoiceTotals = (invoice) => {
  const subtotal = invoice.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  invoice.subtotal = subtotal;
  invoice.totalAmount = subtotal + (invoice.totalTax || 0) - (invoice.discountAmount || 0);
  invoice.dueAmount = invoice.totalAmount - (invoice.paidAmount || 0);
};

// Medicine CRUD
exports.createMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, data: medicine });
  } catch (err) { next(err); }
};

exports.getMedicines = async (req, res, next) => {
  try {
    const { search, category, sort = '-createdAt', page = 1, limit = 50, lowStock } = req.query;
    const query = { isActive: true };
    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (lowStock === 'true') query.$expr = { $lte: ['$stock', '$reorderLevel'] };

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    res.json({ success: true, data: medicines, pagination: { total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getMedicine = async (req, res, next) => {
  try {
    const med = await Medicine.findById(req.params.id);
    if (!med) throw new AppError('Medicine not found', 404);
    res.json({ success: true, data: med });
  } catch (err) { next(err); }
};

exports.updateMedicine = async (req, res, next) => {
  try {
    const med = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!med) throw new AppError('Medicine not found', 404);
    res.json({ success: true, data: med });
  } catch (err) { next(err); }
};

exports.deleteMedicine = async (req, res, next) => {
  try {
    await Medicine.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Medicine deactivated' });
  } catch (err) { next(err); }
};

// Pharmacy stats
exports.getPharmacyStats = async (req, res, next) => {
  try {
    const totalMedicines = await Medicine.countDocuments({ isActive: true });
    const lowStockCount = await Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$reorderLevel'] } });
    const outOfStock = await Medicine.countDocuments({ isActive: true, stock: 0 });
    const expiringIn30 = await Medicine.countDocuments({
      isActive: true,
      expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 3600000), $gte: new Date() }
    });
    const activePrescriptions = await Prescription.countDocuments({ status: { $in: ['active', 'partially_dispensed'] } });
    const todayDispensed = await Prescription.countDocuments({
      status: 'fully_dispensed',
      updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const totalValue = await Medicine.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, value: { $sum: { $multiply: ['$purchasePrice', '$stock'] } } } }
    ]);

    res.json({
      success: true,
      data: {
        totalMedicines, lowStockCount, outOfStock, expiringIn30,
        activePrescriptions, todayDispensed,
        inventoryValue: totalValue[0]?.value || 0
      }
    });
  } catch (err) { next(err); }
};

// Stock adjustments
exports.adjustStock = async (req, res, next) => {
  try {
    const { medicineId, type, quantity, reason, reference } = req.body;
    const med = await Medicine.findById(medicineId);
    if (!med) throw new AppError('Medicine not found', 404);

    const previousStock = med.stock;
    const delta = ['purchase', 'return', 'adjustment'].includes(type) ? quantity : -quantity;
    med.stock = Math.max(0, previousStock + delta);
    await med.save();

    const adj = await StockAdjustment.create({
      medicine: med._id, type, quantity, previousStock, newStock: med.stock,
      reason, reference, adjustedBy: req.user._id
    });

    res.status(201).json({ success: true, data: adj });
  } catch (err) { next(err); }
};

exports.getStockHistory = async (req, res, next) => {
  try {
    const { medicineId, page = 1, limit = 30 } = req.query;
    const query = medicineId ? { medicine: medicineId } : {};
    const total = await StockAdjustment.countDocuments(query);
    const history = await StockAdjustment.find(query)
      .populate('medicine', 'name batchNumber')
      .populate('adjustedBy', 'firstName lastName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(+limit);

    res.json({ success: true, data: history, pagination: { total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// Prescriptions
exports.createPrescription = async (req, res, next) => {
  try {
    const rx = await Prescription.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: rx });
  } catch (err) { next(err); }
};

exports.getPrescriptions = async (req, res, next) => {
  try {
    const { patientId, status, page = 1, limit = 30 } = req.query;
    const query = {};
    if (patientId) query.patient = patientId;
    if (status) query.status = status;

    const total = await Prescription.countDocuments(query);
    const rxs = await Prescription.find(query)
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName specialization name user')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
      .populate('items.medicine', 'name sellingPrice stock')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(+limit);

    res.json({ success: true, data: rxs, pagination: { total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getPharmacyInvoices = async (req, res, next) => {
  try {
    const { patientId, status, page = 1, limit = 30 } = req.query;
    const pageSize = Number(limit) || 30;
    const query = { type: 'pharmacy' };
    if (patientId) query.patient = patientId;

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('patient', 'firstName lastName patientId')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(pageSize);

    const formatted = invoices
      .map((invoice) => {
        const inv = invoice.toObject();
        inv.dueAmount = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
        inv.status = getComputedInvoiceStatus(inv);
        return inv;
      })
      .filter((inv) => (status ? inv.status === status : true));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total: status ? formatted.length : total,
        page: +page,
        pages: status ? Math.ceil(formatted.length / pageSize) : Math.ceil(total / pageSize)
      }
    });
  } catch (err) { next(err); }
};

exports.dispensePrescription = async (req, res, next) => {
  try {
    const rx = await Prescription.findById(req.params.id).populate('items.medicine');
    if (!rx) throw new AppError('Prescription not found', 404);

    const { items } = req.body;
    let allDispensed = true;
    let hasAnyDispense = false;

    const invoice = await getOrCreatePharmacyInvoice({
      patientId: rx.patient,
      admissionId: rx.admission || null,
      userId: req.user._id
    });

    for (const dispenseItem of items) {
      const rxItem = rx.items.id(dispenseItem.itemId);
      if (!rxItem) continue;

      const med = await Medicine.findById(rxItem.medicine?._id || rxItem.medicine);
      if (!med) continue;

      const qty = Math.min(dispenseItem.dispensedQty, med.stock);
      if (qty <= 0) continue;
      hasAnyDispense = true;

      const prevStock = med.stock;
      med.stock -= qty;
      await med.save();

      await StockAdjustment.create({
        medicine: med._id,
        type: 'dispense',
        quantity: qty,
        previousStock: prevStock,
        newStock: med.stock,
        reason: `Dispensed for Rx ${rx._id}`,
        adjustedBy: req.user._id
      });

      rxItem.dispensed = true;
      rxItem.dispensedQty = (rxItem.dispensedQty || 0) + qty;
      rxItem.dispensedAt = new Date();

      const amount = qty * med.sellingPrice;
      const lineDescription = `${rxItem.medicineName} x${qty}`;

      const ledgerEntry = await BillingLedger.create({
        patient: rx.patient,
        admission: rx.admission || undefined,
        sourceType: 'pharmacy',
        sourceId: rx._id,
        category: 'medication',
        description: lineDescription,
        quantity: qty,
        unitPrice: med.sellingPrice,
        amount,
        recordedBy: req.user._id
      });

      invoice.items.push({
        description: lineDescription,
        category: 'medication',
        quantity: qty,
        unitPrice: med.sellingPrice,
        discount: 0,
        tax: 0,
        amount
      });

      ledgerEntry.billed = true;
      ledgerEntry.billedAt = new Date();
      ledgerEntry.invoice = invoice._id;
      await ledgerEntry.save();

      if (rxItem.dispensedQty < rxItem.quantity) allDispensed = false;
    }

    if (hasAnyDispense) {
      recalculateInvoiceTotals(invoice);
      invoice.lastUpdatedBy = req.user._id;
      await invoice.save();
    }

    rx.status = allDispensed ? 'fully_dispensed' : 'partially_dispensed';
    await rx.save();

    res.json({ success: true, data: { prescription: rx, invoice: hasAnyDispense ? invoice : null } });
  } catch (err) { next(err); }
};

exports.cancelPrescription = async (req, res, next) => {
  try {
    const rx = await Prescription.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!rx) throw new AppError('Prescription not found', 404);
    res.json({ success: true, data: rx });
  } catch (err) { next(err); }
};
