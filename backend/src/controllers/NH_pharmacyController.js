const Medicine = require('../models/NH_Medicine');
const Prescription = require('../models/NH_Prescription');
const StockAdjustment = require('../models/NH_StockAdjustment');
const { BillingLedger, Invoice, Admission, Patient } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// ──────────── MEDICINE CRUD ────────────

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

// ──────────── PHARMACY STATS ────────────

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

// ──────────── STOCK ADJUSTMENTS ────────────

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
      .populate('medicine', 'name')
      .populate('adjustedBy', 'firstName lastName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(+limit);

    res.json({ success: true, data: history, pagination: { total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ──────────── PRESCRIPTIONS ────────────

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
      .populate('doctor', 'firstName lastName specialization')
      .populate('items.medicine', 'name sellingPrice stock')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(+limit);

    res.json({ success: true, data: rxs, pagination: { total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.dispensePrescription = async (req, res, next) => {
  try {
    const rx = await Prescription.findById(req.params.id).populate('items.medicine');
    if (!rx) throw new AppError('Prescription not found', 404);

    const { items } = req.body; // [{ itemId, dispensedQty }]
    let allDispensed = true;

    for (const dispenseItem of items) {
      const rxItem = rx.items.id(dispenseItem.itemId);
      if (!rxItem) continue;

      const med = await Medicine.findById(rxItem.medicine._id || rxItem.medicine);
      if (!med) continue;

      const qty = Math.min(dispenseItem.dispensedQty, med.stock);
      if (qty <= 0) continue;

      const prevStock = med.stock;
      med.stock -= qty;
      await med.save();

      await StockAdjustment.create({
        medicine: med._id, type: 'dispense', quantity: qty,
        previousStock: prevStock, newStock: med.stock,
        reason: `Dispensed for Rx ${rx._id}`, adjustedBy: req.user._id
      });

      rxItem.dispensed = true;
      rxItem.dispensedQty = (rxItem.dispensedQty || 0) + qty;
      rxItem.dispensedAt = new Date();

      // Create billing ledger entry
      await BillingLedger.create({
        patient: rx.patient,
        admission: rx.admission || undefined,
        sourceType: 'pharmacy',
        sourceId: rx._id,
        category: 'medication',
        description: `${rxItem.medicineName} x${qty}`,
        quantity: qty,
        unitPrice: med.sellingPrice,
        amount: qty * med.sellingPrice,
        recordedBy: req.user._id
      });

      if (rxItem.dispensedQty < rxItem.quantity) allDispensed = false;
    }

    rx.status = allDispensed ? 'fully_dispensed' : 'partially_dispensed';
    await rx.save();

    res.json({ success: true, data: rx });
  } catch (err) { next(err); }
};

exports.cancelPrescription = async (req, res, next) => {
  try {
    const rx = await Prescription.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!rx) throw new AppError('Prescription not found', 404);
    res.json({ success: true, data: rx });
  } catch (err) { next(err); }
};
