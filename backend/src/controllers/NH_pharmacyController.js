const BaseMedicine = require('../models/NH_Medicine');
const BasePrescription = require('../models/NH_Prescription');
const BaseStockAdjustment = require('../models/NH_StockAdjustment');
const BaseBillingLedger = require('../models/NH_BillingLedger');
const BaseInvoice = require('../models/NH_Invoice');
const BaseUser = require('../models/NH_User');
const BaseNotification = require('../models/NH_Notification');
const BaseAppointment = require('../models/NH_Appointment');
const { AppError } = require('../middleware/errorHandler');
const { getEffectiveModuleConfig } = require('../utils/moduleOperationsSettings');
const { getModel } = require('../utils/tenantModel');

const getModels = (req) => ({
  Medicine: getModel(req, 'Medicine', BaseMedicine),
  Prescription: getModel(req, 'Prescription', BasePrescription),
  StockAdjustment: getModel(req, 'StockAdjustment', BaseStockAdjustment),
  BillingLedger: getModel(req, 'BillingLedger', BaseBillingLedger),
  Invoice: getModel(req, 'Invoice', BaseInvoice),
  User: getModel(req, 'User', BaseUser),
  Notification: getModel(req, 'Notification', BaseNotification),
  Appointment: getModel(req, 'Appointment', BaseAppointment),
});

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

const getOrCreatePharmacyInvoice = async ({ Invoice, patientId, admissionId, userId, mode = 'internal', externalPatient }) => {
  const query = {
    type: 'pharmacy',
    status: { $in: ['draft', 'pending', 'partial', 'overdue'] },
    billingScope: mode === 'external' ? 'external' : 'internal'
  };

  if (mode === 'external') {
    query['externalPatientInfo.name'] = String(externalPatient?.name || '').trim();
  } else {
    query.patient = patientId;
    query.admission = admissionId || null;
  }

  let invoice = await Invoice.findOne(query);

  if (invoice) return invoice;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const invoicePayload = {
    type: 'pharmacy',
    sourceModule: 'pharmacy',
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
  };

  if (mode === 'external') {
    invoicePayload.billingScope = 'external';
    invoicePayload.externalPatientInfo = {
      name: externalPatient?.name || 'Walk-in',
      age: externalPatient?.age,
      gender: externalPatient?.gender,
      phone: externalPatient?.phone,
      address: externalPatient?.address,
      referredBy: externalPatient?.referredBy
    };
  } else {
    invoicePayload.billingScope = 'internal';
    invoicePayload.patient = patientId;
    invoicePayload.admission = admissionId || undefined;
  }

  return Invoice.create(invoicePayload);
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
    const { Medicine } = getModels(req);
    const medicine = await Medicine.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, data: medicine });
  } catch (err) { next(err); }
};

exports.getMedicines = async (req, res, next) => {
  try {
    const { Medicine } = getModels(req);
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
    const { Medicine } = getModels(req);
    const med = await Medicine.findById(req.params.id);
    if (!med) throw new AppError('Medicine not found', 404);
    res.json({ success: true, data: med });
  } catch (err) { next(err); }
};

exports.updateMedicine = async (req, res, next) => {
  try {
    const { Medicine } = getModels(req);
    const med = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!med) throw new AppError('Medicine not found', 404);
    res.json({ success: true, data: med });
  } catch (err) { next(err); }
};

exports.deleteMedicine = async (req, res, next) => {
  try {
    const { Medicine } = getModels(req);
    await Medicine.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Medicine deactivated' });
  } catch (err) { next(err); }
};

// Pharmacy stats
exports.getPharmacyStats = async (req, res, next) => {
  try {
    const { Medicine, Prescription } = getModels(req);
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
    const { Medicine, StockAdjustment } = getModels(req);
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
    const { StockAdjustment } = getModels(req);
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
    const { Prescription, Appointment } = getModels(req);
    const payload = { ...req.body };
    const { mode = 'internal', externalPatient } = payload;
    const appointmentId = payload.appointment;
    const moduleConfig = await getEffectiveModuleConfig({ moduleKey: 'pharmacy', userId: req.user._id, req });

    if (!moduleConfig.enabled) {
      throw new AppError('Pharmacy module is disabled by settings', 403);
    }

    if (mode === 'internal' && !payload.patient) {
      throw new AppError('Patient is required for internal mode', 400);
    }
    if (mode === 'internal' && !moduleConfig.integrateWithHospitalCore) {
      throw new AppError('Pharmacy module is configured for standalone mode only', 403);
    }
    if (mode === 'external' && !moduleConfig.runIndependently) {
      throw new AppError('Standalone pharmacy workflow is disabled', 403);
    }
    if (mode === 'external' && !moduleConfig.allowExternalWalkIns) {
      throw new AppError('External walk-ins are disabled for pharmacy', 403);
    }
    if (mode === 'external' && (!externalPatient || !externalPatient.name)) {
      throw new AppError('External patient name is required', 400);
    }

    // Set mode-specific fields
    payload.mode = mode;
    if (mode === 'external') {
      payload.externalPatient = externalPatient;
      payload.patient = undefined;
      payload.doctor = payload.doctor || undefined;
    }

    if (appointmentId && mode === 'internal') {
      const appointment = await Appointment.findById(appointmentId).select('patient doctor prescription');
      if (!appointment) throw new AppError('Appointment not found', 404);

      if (String(appointment.patient) !== String(payload.patient)) {
        throw new AppError('Appointment does not belong to selected patient', 400);
      }

      const existingForAppointment = await Prescription.findOne({ appointment: appointmentId }).select('_id');
      if (existingForAppointment || appointment.prescription) {
        throw new AppError('This appointment already has a prescription', 400);
      }

      payload.appointment = appointmentId;
    }

    const rx = await Prescription.create({ ...payload, createdBy: req.user._id });

    if (appointmentId && mode === 'internal') {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        { status: 'completed', prescription: String(rx._id) },
        { new: true }
      );
    }

    res.status(201).json({ success: true, data: rx });
  } catch (err) { next(err); }
};

exports.updatePrescription = async (req, res, next) => {
  try {
    const { Prescription, Appointment } = getModels(req);
    const prescriptionId = req.params.id;
    const payload = { ...req.body };
    const appointmentId = payload.appointment;

    const existing = await Prescription.findById(prescriptionId);
    if (!existing) throw new AppError('Prescription not found', 404);

    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId).select('patient prescription');
      if (!appointment) throw new AppError('Appointment not found', 404);
      if (String(appointment.patient) !== String(payload.patient || existing.patient)) {
        throw new AppError('Appointment does not belong to selected patient', 400);
      }

      const duplicate = await Prescription.findOne({
        appointment: appointmentId,
        _id: { $ne: prescriptionId }
      }).select('_id');
      if (duplicate) {
        throw new AppError('This appointment already has a prescription', 400);
      }
    }

    const updated = await Prescription.findByIdAndUpdate(
      prescriptionId,
      payload,
      { new: true, runValidators: true }
    );

    const finalAppointmentId = appointmentId || updated?.appointment;
    if (finalAppointmentId) {
      await Appointment.findByIdAndUpdate(
        finalAppointmentId,
        { status: 'completed', prescription: String(updated._id) },
        { new: true }
      );
    }

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.getPrescriptions = async (req, res, next) => {
  try {
    const { Prescription } = getModels(req);
    const { patientId, appointmentId, status, mode, page = 1, limit = 30 } = req.query;
    const query = {};
    if (patientId) query.patient = patientId;
    if (appointmentId) query.appointment = appointmentId;
    if (status) query.status = status;
    if (mode && mode !== 'all') query.mode = mode;

    const total = await Prescription.countDocuments(query);
    const rxs = await Prescription.find(query)
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName specialization name user')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
      .populate('appointment', 'appointmentId appointmentDate timeSlot status')
      .populate('items.medicine', 'name sellingPrice stock')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(+limit);

    res.json({ success: true, data: rxs, pagination: { total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.getPrescription = async (req, res, next) => {
  try {
    const { Prescription } = getModels(req);
    const rx = await Prescription.findById(req.params.id)
      .populate('patient', 'firstName lastName patientId gender dateOfBirth')
      .populate('doctor', 'firstName lastName specialization name user')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName email' } })
      .populate('appointment', 'appointmentId appointmentDate timeSlot status')
      .populate('items.medicine', 'name sellingPrice stock');

    if (!rx) throw new AppError('Prescription not found', 404);

    res.json({ success: true, data: rx });
  } catch (err) { next(err); }
};

exports.getPharmacyInvoices = async (req, res, next) => {
  try {
    const { Invoice } = getModels(req);
    const { patientId, status, billingScope, page = 1, limit = 30 } = req.query;
    const pageSize = Number(limit) || 30;
    const query = { type: 'pharmacy' };
    if (patientId) query.patient = patientId;
    if (billingScope) query.billingScope = billingScope;

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
    const { Prescription, Medicine, Invoice, StockAdjustment, BillingLedger } = getModels(req);
    const rx = await Prescription.findById(req.params.id).populate('items.medicine');
    if (!rx) throw new AppError('Prescription not found', 404);
    const moduleConfig = await getEffectiveModuleConfig({ moduleKey: 'pharmacy', userId: req.user._id, req });

    if (!moduleConfig.enabled) {
      throw new AppError('Pharmacy module is disabled by settings', 403);
    }
    if (rx.mode === 'external' && !moduleConfig.externalBillingEnabled) {
      throw new AppError('External billing is disabled for pharmacy', 403);
    }

    const { items } = req.body;
    let allDispensed = true;
    let hasAnyDispense = false;

    const invoice = await getOrCreatePharmacyInvoice({
      Invoice,
      patientId: rx.patient,
      admissionId: rx.admission || null,
      userId: req.user._id,
      mode: rx.mode || 'internal',
      externalPatient: rx.externalPatient
    });

    for (const dispenseItem of items) {
      const rxItem = rx.items.id(dispenseItem.itemId);
      if (!rxItem) continue;
      if (!rxItem.medicine) {
        allDispensed = false;
        continue;
      }

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

      const ledgerEntry = (rx.mode === 'internal' && rx.patient)
        ? await BillingLedger.create({
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
        })
        : null;

      invoice.items.push({
        description: lineDescription,
        category: 'medication',
        quantity: qty,
        unitPrice: med.sellingPrice,
        discount: 0,
        tax: 0,
        amount
      });

      if (ledgerEntry) {
        ledgerEntry.billed = true;
        ledgerEntry.billedAt = new Date();
        ledgerEntry.invoice = invoice._id;
        await ledgerEntry.save();
      }

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
    const { Prescription } = getModels(req);
    const rx = await Prescription.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!rx) throw new AppError('Prescription not found', 404);
    res.json({ success: true, data: rx });
  } catch (err) { next(err); }
};

exports.sharePrescription = async (req, res, next) => {
  try {
    const { Prescription, Notification } = getModels(req);
    const prescriptionId = req.params.id;
    const recipientIds = Array.isArray(req.body?.recipientIds) ? req.body.recipientIds : [];
    const note = String(req.body?.note || '').trim();

    if (!recipientIds.length) throw new AppError('recipientIds is required', 400);

    const rx = await Prescription.findById(prescriptionId).populate('patient', 'firstName lastName patientId');
    if (!rx) throw new AppError('Prescription not found', 404);

    const privilegedRoles = ['super_admin', 'hospital_admin', 'doctor'];
    if (!privilegedRoles.includes(req.user?.role)) {
      const acknowledgedShare = await Notification.findOne({
        recipient: req.user._id,
        type: 'prescription_shared',
        'data.entityId': rx._id,
        acknowledgedBy: req.user._id
      });
      if (!acknowledgedShare) {
        throw new AppError('You must acknowledge this prescription before forwarding it', 403);
      }
    }

    const uniqueRecipientIds = Array.from(new Set(recipientIds.map((id) => String(id))));
    const patientName = `${rx.patient?.firstName || ''} ${rx.patient?.lastName || ''}`.trim() || 'Patient';
    const senderName = req.user?.fullName || req.user?.email || 'Clinical User';

    const notifications = uniqueRecipientIds.map((recipientId) => ({
      recipient: recipientId,
      type: 'prescription_shared',
      title: 'Prescription Shared',
      message: `${senderName} shared prescription for ${patientName}${note ? ` - ${note}` : ''}`,
      priority: 'high',
      requiresAcknowledgement: true,
      data: {
        entityType: 'prescription',
        entityId: rx._id,
        patientId: rx.patient?._id,
        link: `/prescriptions/${rx._id}/preview`,
        sharedBy: req.user._id
      }
    }));

    const created = await Notification.insertMany(notifications);
    res.status(201).json({
      success: true,
      message: 'Prescription shared successfully',
      data: { count: created.length }
    });
  } catch (err) { next(err); }
};

exports.requestMedicineStock = async (req, res, next) => {
  try {
    const { User, Notification } = getModels(req);
    const medicineName = String(req.body?.medicineName || '').trim();
    const patientId = req.body?.patientId || null;
    const encounterType = String(req.body?.encounterType || 'opd').trim().toLowerCase();
    const reason = String(req.body?.reason || '').trim();

    if (!medicineName) throw new AppError('medicineName is required', 400);

    const recipients = await User.find({
      role: { $in: ['super_admin', 'hospital_admin', 'billing_staff'] },
      isActive: true
    }).select('_id');

    if (recipients.length > 0) {
      const notifications = recipients.map((recipient) => ({
        recipient: recipient._id,
        type: 'alert',
        title: 'Medicine Stock Request',
        message: `${req.user?.email || 'A clinical user'} requested stock for "${medicineName}" (${encounterType.toUpperCase()}).`,
        priority: 'high',
        data: {
          entityType: 'medicine_request',
          entityId: patientId || undefined,
          medicineName,
          encounterType,
          requestedBy: req.user?._id,
          reason
        }
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      message: 'Stock request sent to pharmacy/admin team',
      data: { medicineName, requested: recipients.length }
    });
  } catch (err) { next(err); }
};
