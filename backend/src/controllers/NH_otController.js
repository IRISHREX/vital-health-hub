const Surgery = require('../models/NH_Surgery');
const OTRoom = require('../models/NH_OTRoom');
const Invoice = require('../models/NH_Invoice');
const BillingLedger = require('../models/NH_BillingLedger');
const { Admission, Doctor } = require('../models');
const asyncHandler = require('express-async-handler');

// ==================== OT ROOMS ====================

const getOTRooms = asyncHandler(async (req, res) => {
  const { status, type } = req.query;
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;
  const rooms = await OTRoom.find(query).sort({ roomNumber: 1 });
  res.json({ success: true, data: rooms });
});

const createOTRoom = asyncHandler(async (req, res) => {
  const room = await OTRoom.create(req.body);
  res.status(201).json({ success: true, data: room });
});

const updateOTRoom = asyncHandler(async (req, res) => {
  const room = await OTRoom.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!room) { res.status(404); throw new Error('OT Room not found'); }
  res.json({ success: true, data: room });
});

const deleteOTRoom = asyncHandler(async (req, res) => {
  const room = await OTRoom.findById(req.params.id);
  if (!room) { res.status(404); throw new Error('OT Room not found'); }
  room.isActive = false;
  await room.save();
  res.json({ success: true, message: 'OT Room deactivated' });
});

// ==================== SURGERIES CRUD ====================

const getSurgeries = asyncHandler(async (req, res) => {
  const { patientId, status, urgency, surgeonId, otRoomId, startDate, endDate } = req.query;
  const query = {};
  if (patientId) query.patient = patientId;
  if (status) query.status = status;
  if (urgency) query.urgency = urgency;
  if (surgeonId) query.primarySurgeon = surgeonId;
  if (otRoomId) query.otRoom = otRoomId;
  if (startDate && endDate) {
    query.scheduledDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const surgeries = await Surgery.find(query)
    .populate('patient', 'firstName lastName patientId phone gender dateOfBirth')
    .populate('primarySurgeon', 'name specialization')
    .populate('anesthetist', 'name specialization')
    .populate('otRoom', 'roomNumber name type')
    .populate('admission', 'admissionId status')
    .populate('requestedBy', 'firstName lastName')
    .populate('team.doctor', 'name specialization')
    .populate('team.user', 'firstName lastName')
    .sort({ scheduledDate: -1, createdAt: -1 });

  res.json({ success: true, data: { surgeries, count: surgeries.length } });
});

const getSurgeryById = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id)
    .populate('patient')
    .populate('primarySurgeon', 'name specialization')
    .populate('anesthetist', 'name specialization')
    .populate('otRoom')
    .populate('admission')
    .populate('requestedBy', 'firstName lastName')
    .populate('scheduledBy', 'firstName lastName')
    .populate('team.doctor', 'name specialization')
    .populate('team.user', 'firstName lastName')
    .populate('preOpChecklist.completedBy', 'firstName lastName')
    .populate('recoveryBed');

  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }
  res.json({ success: true, data: surgery });
});

const createSurgery = asyncHandler(async (req, res) => {
  if (!req.body?.patient) {
    res.status(400);
    throw new Error('Patient is required');
  }
  if (!req.body?.primarySurgeon) {
    res.status(400);
    throw new Error('Primary surgeon is required');
  }

  const activeAdmission = await Admission.findOne({
    patient: req.body.patient,
    status: 'ADMITTED'
  }).select('_id');

  if (!activeAdmission) {
    res.status(400);
    throw new Error('Only admitted patients can be selected for surgery request');
  }

  const primarySurgeon = await Doctor.findById(req.body.primarySurgeon).select('_id');
  if (!primarySurgeon) {
    res.status(400);
    throw new Error('Primary surgeon must be a valid doctor');
  }
  if (req.body.anesthetist) {
    const anesthetist = await Doctor.findById(req.body.anesthetist).select('_id');
    if (!anesthetist) {
      res.status(400);
      throw new Error('Anesthetist must be a valid doctor');
    }
  }

  const data = {
    ...req.body,
    admission: req.body.admission || activeAdmission._id,
    requestedBy: req.user._id,
    preOpChecklist: req.body.preOpChecklist || [
      { label: 'Lab tests completed' },
      { label: 'Consent form signed' },
      { label: 'Blood availability confirmed' },
      { label: 'Anesthesia fitness cleared' },
      { label: 'NPO status confirmed' },
      { label: 'IV line established' },
      { label: 'Site marking done' },
      { label: 'Patient identity verified' }
    ]
  };

  const surgery = await Surgery.create(data);
  const populated = await Surgery.findById(surgery._id)
    .populate('patient', 'firstName lastName patientId')
    .populate('primarySurgeon', 'name')
    .populate('otRoom', 'roomNumber name');

  res.status(201).json({ success: true, data: populated });
});

const updateSurgery = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('patient', 'firstName lastName patientId')
    .populate('primarySurgeon', 'name')
    .populate('otRoom', 'roomNumber name');
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }
  res.json({ success: true, data: surgery });
});

const deleteSurgery = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }
  if (!['requested', 'approved'].includes(surgery.status)) {
    res.status(400); throw new Error('Can only cancel surgeries in requested/approved status');
  }
  surgery.status = 'cancelled';
  surgery.cancelReason = req.body.reason || 'Cancelled by admin';
  await surgery.save();
  res.json({ success: true, message: 'Surgery cancelled' });
});

// ==================== WORKFLOW ====================

const approveSurgery = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }
  surgery.status = 'approved';
  await surgery.save();
  res.json({ success: true, data: surgery, message: 'Surgery approved' });
});

const scheduleSurgery = asyncHandler(async (req, res) => {
  const { otRoom, scheduledDate, scheduledStartTime, scheduledEndTime, team } = req.body;
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }

  // Check OT room availability
  if (otRoom && scheduledDate) {
    const conflict = await Surgery.findOne({
      _id: { $ne: surgery._id },
      otRoom,
      scheduledDate: new Date(scheduledDate),
      status: { $nin: ['cancelled', 'completed'] },
      scheduledStartTime: { $lt: scheduledEndTime || '23:59' },
      scheduledEndTime: { $gt: scheduledStartTime || '00:00' }
    });
    if (conflict) {
      res.status(409);
      throw new Error(`OT room conflict with surgery ${conflict.surgeryId}`);
    }
  }

  surgery.status = 'scheduled';
  surgery.otRoom = otRoom || surgery.otRoom;
  surgery.scheduledDate = scheduledDate || surgery.scheduledDate;
  surgery.scheduledStartTime = scheduledStartTime || surgery.scheduledStartTime;
  surgery.scheduledEndTime = scheduledEndTime || surgery.scheduledEndTime;
  surgery.scheduledBy = req.user._id;
  if (team) surgery.team = team;
  await surgery.save();

  const populated = await Surgery.findById(surgery._id)
    .populate('otRoom', 'roomNumber name')
    .populate('patient', 'firstName lastName patientId');

  res.json({ success: true, data: populated, message: 'Surgery scheduled' });
});

const updateChecklist = asyncHandler(async (req, res) => {
  const { itemId, completed, notes } = req.body;
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }

  const item = surgery.preOpChecklist.id(itemId);
  if (!item) { res.status(404); throw new Error('Checklist item not found'); }

  item.completed = completed;
  item.completedBy = req.user._id;
  item.completedAt = completed ? new Date() : null;
  if (notes) item.notes = notes;

  // Auto-advance to preop_check if all items completed
  const allCompleted = surgery.preOpChecklist.every(i => i.completed);
  if (allCompleted && surgery.status === 'scheduled') {
    surgery.status = 'preop_check';
  }

  await surgery.save();
  res.json({ success: true, data: surgery });
});

const patientInOT = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }

  surgery.status = 'in_ot';
  surgery.timestamps = { ...surgery.timestamps?.toObject?.() || {}, patientArrivedAt: new Date() };

  // Mark OT room as in_use
  if (surgery.otRoom) {
    await OTRoom.findByIdAndUpdate(surgery.otRoom, { status: 'in_use' });
  }

  await surgery.save();
  res.json({ success: true, data: surgery });
});

const startAnesthesia = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }
  surgery.status = 'anesthesia_started';
  surgery.timestamps = { ...surgery.timestamps?.toObject?.() || {}, anesthesiaStartedAt: new Date() };
  if (req.body.anesthesiaType) surgery.anesthesiaType = req.body.anesthesiaType;
  await surgery.save();
  res.json({ success: true, data: surgery });
});

const startSurgery = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }
  surgery.status = 'surgery_started';
  surgery.timestamps = { ...surgery.timestamps?.toObject?.() || {}, incisionAt: new Date() };
  await surgery.save();
  res.json({ success: true, data: surgery });
});

const endSurgery = asyncHandler(async (req, res) => {
  const { operativeNotes, complications, bloodLoss, consumables, implants } = req.body;
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }

  surgery.status = 'surgery_ended';
  surgery.timestamps = { ...surgery.timestamps?.toObject?.() || {}, closureAt: new Date(), anesthesiaEndedAt: new Date() };
  if (operativeNotes) surgery.operativeNotes = operativeNotes;
  if (complications) surgery.complications = complications;
  if (bloodLoss) surgery.bloodLoss = bloodLoss;
  if (consumables) surgery.consumables = consumables;
  if (implants) surgery.implants = implants;

  // Release OT room
  if (surgery.otRoom) {
    await OTRoom.findByIdAndUpdate(surgery.otRoom, { status: 'cleaning' });
  }

  await surgery.save();
  res.json({ success: true, data: surgery });
});

const moveToRecovery = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }

  surgery.status = 'recovery';
  surgery.timestamps = { ...surgery.timestamps?.toObject?.() || {}, patientOutAt: new Date(), recoveryStartAt: new Date() };
  if (req.body.recoveryBed) surgery.recoveryBed = req.body.recoveryBed;
  if (req.body.postOpOrders) surgery.postOpOrders = req.body.postOpOrders;
  await surgery.save();
  res.json({ success: true, data: surgery });
});

const completeRecovery = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }

  surgery.status = 'post_op';
  surgery.timestamps = { ...surgery.timestamps?.toObject?.() || {}, recoveryEndAt: new Date() };
  if (req.body.recoveryNotes) surgery.recoveryNotes = req.body.recoveryNotes;
  if (req.body.painScore !== undefined) surgery.painScore = req.body.painScore;
  await surgery.save();
  res.json({ success: true, data: surgery });
});

const completeSurgery = asyncHandler(async (req, res) => {
  const surgery = await Surgery.findById(req.params.id);
  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }
  surgery.status = 'completed';
  await surgery.save();

  // Auto-create billing ledger entries if admission exists
  if (surgery.admission && !surgery.billed) {
    const entries = [];
    if (surgery.otRoomCharges > 0) entries.push({ admission: surgery.admission, patient: surgery.patient, sourceType: 'procedure', category: 'surgery', description: `OT Room - ${surgery.procedureName}`, quantity: 1, unitPrice: surgery.otRoomCharges, amount: surgery.otRoomCharges, recordedBy: req.user._id });
    if (surgery.surgeonFee > 0) entries.push({ admission: surgery.admission, patient: surgery.patient, sourceType: 'procedure', category: 'doctor_fee', description: `Surgeon Fee - ${surgery.procedureName}`, quantity: 1, unitPrice: surgery.surgeonFee, amount: surgery.surgeonFee, recordedBy: req.user._id });
    if (surgery.anesthetistFee > 0) entries.push({ admission: surgery.admission, patient: surgery.patient, sourceType: 'procedure', category: 'doctor_fee', description: `Anesthetist Fee - ${surgery.procedureName}`, quantity: 1, unitPrice: surgery.anesthetistFee, amount: surgery.anesthetistFee, recordedBy: req.user._id });
    if (surgery.consumableCharges > 0) entries.push({ admission: surgery.admission, patient: surgery.patient, sourceType: 'procedure', category: 'medication', description: `OT Consumables - ${surgery.procedureName}`, quantity: 1, unitPrice: surgery.consumableCharges, amount: surgery.consumableCharges, recordedBy: req.user._id });

    if (entries.length) await BillingLedger.insertMany(entries);
  }

  res.json({ success: true, data: surgery, message: 'Surgery completed' });
});

// ==================== STATS ====================

const getOTStats = asyncHandler(async (req, res) => {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const [total, scheduled, inProgress, completed, todayCount, rooms] = await Promise.all([
    Surgery.countDocuments(),
    Surgery.countDocuments({ status: { $in: ['requested', 'approved', 'scheduled', 'preop_check'] } }),
    Surgery.countDocuments({ status: { $in: ['in_ot', 'anesthesia_started', 'surgery_started'] } }),
    Surgery.countDocuments({ status: 'completed' }),
    Surgery.countDocuments({ scheduledDate: { $gte: todayStart } }),
    OTRoom.find({ isActive: true })
  ]);

  const revenueResult = await Surgery.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalCharges' } } }
  ]);

  const urgencyStats = await Surgery.aggregate([
    { $group: { _id: '$urgency', count: { $sum: 1 } } }
  ]);

  const availableRooms = rooms.filter(r => r.status === 'available').length;

  res.json({
    success: true,
    data: {
      total, scheduled, inProgress, completed,
      todayCount,
      totalRooms: rooms.length,
      availableRooms,
      totalRevenue: revenueResult[0]?.total || 0,
      urgencyStats
    }
  });
});

// ==================== OT SCHEDULE ====================

const getOTSchedule = asyncHandler(async (req, res) => {
  const { date, otRoomId } = req.query;
  const query = { status: { $nin: ['cancelled'] } };

  if (date) {
    const d = new Date(date);
    query.scheduledDate = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
  }
  if (otRoomId) query.otRoom = otRoomId;

  const surgeries = await Surgery.find(query)
    .populate('patient', 'firstName lastName patientId')
    .populate('primarySurgeon', 'name specialization')
    .populate('anesthetist', 'name')
    .populate('otRoom', 'roomNumber name type')
    .sort({ scheduledStartTime: 1 });

  res.json({ success: true, data: surgeries });
});

// ==================== INVOICE ====================

const generateOTInvoice = asyncHandler(async (req, res) => {
  const { surgeryId } = req.body;
  const surgery = await Surgery.findById(surgeryId)
    .populate('patient', 'firstName lastName patientId')
    .populate('primarySurgeon', 'name');

  if (!surgery) { res.status(404); throw new Error('Surgery not found'); }
  if (surgery.billed) { res.status(400); throw new Error('Surgery already billed'); }
  if (surgery.totalCharges <= 0) { res.status(400); throw new Error('No charges to bill'); }

  const items = [];
  if (surgery.otRoomCharges > 0) items.push({ description: `OT Room Charges - ${surgery.procedureName}`, category: 'surgery', quantity: 1, unitPrice: surgery.otRoomCharges, amount: surgery.otRoomCharges, discount: 0, tax: 0 });
  if (surgery.surgeonFee > 0) items.push({ description: `Surgeon Fee`, category: 'doctor_fee', quantity: 1, unitPrice: surgery.surgeonFee, amount: surgery.surgeonFee, discount: 0, tax: 0 });
  if (surgery.anesthetistFee > 0) items.push({ description: `Anesthetist Fee`, category: 'doctor_fee', quantity: 1, unitPrice: surgery.anesthetistFee, amount: surgery.anesthetistFee, discount: 0, tax: 0 });
  if (surgery.assistantFee > 0) items.push({ description: `Assistant Surgeon Fee`, category: 'doctor_fee', quantity: 1, unitPrice: surgery.assistantFee, amount: surgery.assistantFee, discount: 0, tax: 0 });
  if (surgery.nursingCharges > 0) items.push({ description: `OT Nursing Charges`, category: 'nursing', quantity: 1, unitPrice: surgery.nursingCharges, amount: surgery.nursingCharges, discount: 0, tax: 0 });
  if (surgery.equipmentCharges > 0) items.push({ description: `Equipment Usage`, category: 'procedure', quantity: 1, unitPrice: surgery.equipmentCharges, amount: surgery.equipmentCharges, discount: 0, tax: 0 });
  if (surgery.consumableCharges > 0) items.push({ description: `Consumables & Implants`, category: 'medication', quantity: 1, unitPrice: surgery.consumableCharges, amount: surgery.consumableCharges, discount: 0, tax: 0 });

  const subtotal = items.reduce((s, i) => s + i.amount, 0);

  const invoice = await Invoice.create({
    patient: surgery.patient._id,
    admission: surgery.admission,
    type: 'ot',
    items,
    subtotal,
    totalAmount: subtotal,
    dueAmount: subtotal,
    dueDate: new Date(Date.now() + 30 * 86400000),
    notes: `OT Invoice - ${surgery.procedureName} (${surgery.surgeryId})`,
    generatedBy: req.user._id
  });

  surgery.billed = true;
  surgery.invoiceId = invoice._id;
  await surgery.save();

  res.status(201).json({ success: true, data: invoice, message: 'OT invoice generated' });
});

module.exports = {
  getOTRooms, createOTRoom, updateOTRoom, deleteOTRoom,
  getSurgeries, getSurgeryById, createSurgery, updateSurgery, deleteSurgery,
  approveSurgery, scheduleSurgery, updateChecklist,
  patientInOT, startAnesthesia, startSurgery, endSurgery,
  moveToRecovery, completeRecovery, completeSurgery,
  getOTStats, getOTSchedule, generateOTInvoice
};
