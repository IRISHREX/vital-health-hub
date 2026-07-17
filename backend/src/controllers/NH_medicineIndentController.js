const mongoose = require('mongoose');
const MedicineIndentBase = require('../models/NH_MedicineIndent');
const MedicineBase = require('../models/NH_Medicine');
const StockAdjustmentBase = require('../models/NH_StockAdjustment');
const NotificationBase = require('../models/NH_Notification');
const { getModel } = require('../utils/tenantModel');

const M = (req) => ({
  MedicineIndent: getModel(req, 'MedicineIndent', MedicineIndentBase),
  Medicine: getModel(req, 'Medicine', MedicineBase),
  StockAdjustment: getModel(req, 'StockAdjustment', StockAdjustmentBase),
  Notification: getModel(req, 'Notification', NotificationBase),
});

const listIndents = async (req, res) => {
  try {
    const { MedicineIndent } = M(req);
    const { status, ward, limit = 50, page = 1 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (ward) q.ward = ward;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      MedicineIndent.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate('items.medicine', 'name unit stock')
        .populate('requestedBy', 'name role')
        .populate('issuedBy', 'name role'),
      MedicineIndent.countDocuments(q)
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createIndent = async (req, res) => {
  try {
    const { MedicineIndent } = M(req);
    const { ward, floor, admission, items, priority, notes } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'items required' });
    const doc = await MedicineIndent.create({
      indentNo: `IND-${Date.now().toString(36).toUpperCase()}`,
      ward, floor, admission, items, priority, notes,
      requestedBy: req.user._id
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const issueIndent = async (req, res) => {
  const { id } = req.params;
  const { items: issuedItems } = req.body; // [{ itemId, issuedQty }]
  const { MedicineIndent, Medicine, StockAdjustment, Notification } = M(req);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const ind = await MedicineIndent.findById(id).session(session);
      if (!ind) throw new Error('Indent not found');
      if (!['requested', 'approved'].includes(ind.status)) throw new Error(`Cannot issue a ${ind.status} indent`);

      for (const it of ind.items) {
        const issue = issuedItems?.find(x => String(x.itemId) === String(it._id));
        const qty = Number(issue?.issuedQty ?? it.requestedQty);
        if (qty <= 0) continue;
        const med = await Medicine.findById(it.medicine).session(session);
        if (!med) throw new Error('Medicine missing');
        if ((med.stock || 0) < qty) throw new Error(`Insufficient stock for ${med.name} (have ${med.stock}, need ${qty})`);
        const prev = med.stock;
        med.stock = prev - qty;
        await med.save({ session });
        await StockAdjustment.create([{
          medicine: med._id,
          type: 'dispense',
          quantity: qty,
          previousStock: prev,
          newStock: med.stock,
          reason: `Ward indent ${ind.indentNo}`,
          reference: String(ind._id),
          adjustedBy: req.user._id
        }], { session });
        it.issuedQty = qty;
      }
      ind.status = 'issued';
      ind.issuedBy = req.user._id;
      ind.issuedAt = new Date();
      await ind.save({ session });
      await Notification.create([{
        user: ind.requestedBy,
        title: 'Indent issued',
        message: `Indent ${ind.indentNo} has been issued`,
        type: 'success'
      }], { session }).catch(() => {});
      result = ind;
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

const returnIndent = async (req, res) => {
  const { id } = req.params;
  const { items: returnItems } = req.body; // [{ itemId, returnQty }]
  const { MedicineIndent, Medicine, StockAdjustment } = M(req);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const ind = await MedicineIndent.findById(id).session(session);
      if (!ind) throw new Error('Indent not found');
      if (!['issued', 'partially_returned'].includes(ind.status)) throw new Error(`Cannot return from a ${ind.status} indent`);

      let anyLeft = false;
      for (const it of ind.items) {
        const ret = returnItems?.find(x => String(x.itemId) === String(it._id));
        const qty = Number(ret?.returnQty || 0);
        if (qty <= 0) { if ((it.issuedQty - it.returnedQty) > 0) anyLeft = true; continue; }
        const available = (it.issuedQty || 0) - (it.returnedQty || 0);
        if (qty > available) throw new Error(`Return qty exceeds issued for one line`);
        const med = await Medicine.findById(it.medicine).session(session);
        const prev = med.stock || 0;
        med.stock = prev + qty;
        await med.save({ session });
        await StockAdjustment.create([{
          medicine: med._id,
          type: 'return',
          quantity: qty,
          previousStock: prev,
          newStock: med.stock,
          reason: `Ward return ${ind.indentNo}`,
          reference: String(ind._id),
          adjustedBy: req.user._id
        }], { session });
        it.returnedQty = (it.returnedQty || 0) + qty;
        if ((it.issuedQty - it.returnedQty) > 0) anyLeft = true;
      }
      ind.status = anyLeft ? 'partially_returned' : 'returned';
      ind.returnedAt = new Date();
      await ind.save({ session });
      result = ind;
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

const cancelIndent = async (req, res) => {
  try {
    const { MedicineIndent } = M(req);
    const ind = await MedicineIndent.findById(req.params.id);
    if (!ind) return res.status(404).json({ message: 'Not found' });
    if (!['requested', 'approved'].includes(ind.status)) {
      return res.status(400).json({ message: `Cannot cancel a ${ind.status} indent` });
    }
    ind.status = 'cancelled';
    await ind.save();
    res.json(ind);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listIndents, createIndent, issueIndent, returnIndent, cancelIndent };
