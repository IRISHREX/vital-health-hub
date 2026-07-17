const mongoose = require('mongoose');
const ReturnRequestBase = require('../models/NH_ReturnRequest');
const BillingLedgerBase = require('../models/NH_BillingLedger');
const StockAdjustmentBase = require('../models/NH_StockAdjustment');
const MedicineBase = require('../models/NH_Medicine');
const InvoiceBase = require('../models/NH_Invoice');
const NotificationBase = require('../models/NH_Notification');
const ActivityLogBase = require('../models/NH_ActivityLog');
const { getModel } = require('../utils/tenantModel');

const M = (req) => ({
  ReturnRequest: getModel(req, 'ReturnRequest', ReturnRequestBase),
  BillingLedger: getModel(req, 'BillingLedger', BillingLedgerBase),
  StockAdjustment: getModel(req, 'StockAdjustment', StockAdjustmentBase),
  Medicine: getModel(req, 'Medicine', MedicineBase),
  Invoice: getModel(req, 'Invoice', InvoiceBase),
  Notification: getModel(req, 'Notification', NotificationBase),
  ActivityLog: getModel(req, 'ActivityLog', ActivityLogBase),
});

const listReturns = async (req, res) => {
  try {
    const { ReturnRequest } = M(req);
    const { module: mod, status, patientId, limit = 50, page = 1 } = req.query;
    const q = {};
    if (mod) q.module = mod;
    if (status) q.status = status;
    if (patientId) q.patient = patientId;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      ReturnRequest.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate('patient', 'firstName lastName phone')
        .populate('requestedBy', 'name email')
        .populate('processedBy', 'name email'),
      ReturnRequest.countDocuments(q)
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createReturn = async (req, res) => {
  try {
    const { ReturnRequest } = M(req);
    const { module: mod, sourceType, sourceId, patient, admission, items = [], refundMode = 'none', notes } = req.body;
    if (!mod || !items.length) {
      return res.status(400).json({ message: 'module and items are required' });
    }
    const totalAmount = items.reduce((sum, it) => sum + (Number(it.amount) || (Number(it.qty) * Number(it.unitPrice || 0))), 0);
    const doc = await ReturnRequest.create({
      module: mod, sourceType, sourceId, patient, admission,
      items: items.map(it => ({ ...it, amount: Number(it.amount) || (Number(it.qty) * Number(it.unitPrice || 0)) })),
      totalAmount,
      refundMode,
      refundAmount: refundMode === 'none' ? 0 : totalAmount,
      requestedBy: req.user._id,
      notes
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const processReturn = async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body; // 'approve' | 'reject'
  const { ReturnRequest, BillingLedger, StockAdjustment, Medicine, Notification, ActivityLog } = M(req);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const rr = await ReturnRequest.findById(id).session(session);
      if (!rr) throw new Error('Return request not found');
      if (rr.status !== 'pending') throw new Error(`Cannot process a ${rr.status} return`);

      if (decision === 'reject') {
        rr.status = 'rejected';
        rr.processedBy = req.user._id;
        rr.processedAt = new Date();
        await rr.save({ session });
        result = rr;
        return;
      }

      // Approve → reverse stock + ledger
      if (rr.module === 'pharmacy') {
        for (const it of rr.items) {
          if (!it.itemRef) continue;
          const med = await Medicine.findById(it.itemRef).session(session);
          if (!med) continue;
          const prev = med.stock || 0;
          med.stock = prev + Number(it.qty);
          await med.save({ session });
          await StockAdjustment.create([{
            medicine: med._id,
            type: 'return',
            quantity: Number(it.qty),
            previousStock: prev,
            newStock: med.stock,
            reason: it.reason || `Return: ${rr._id}`,
            reference: String(rr._id),
            adjustedBy: req.user._id
          }], { session });
        }
      }

      // Reverse ledger entry (negative amount)
      if (rr.patient && rr.totalAmount > 0) {
        await BillingLedger.create([{
          patient: rr.patient,
          admission: rr.admission,
          sourceType: 'other',
          sourceId: rr._id,
          category: rr.module === 'pharmacy' ? 'medication' : (rr.module === 'lab' ? 'lab_test' : (rr.module === 'radiology' ? 'radiology' : 'other')),
          description: `Return: ${rr.module} (${rr._id.toString().slice(-6)})`,
          quantity: 1,
          unitPrice: -Number(rr.totalAmount),
          amount: -Number(rr.totalAmount),
          recordedBy: req.user._id
        }], { session });
      }

      rr.status = 'completed';
      rr.processedBy = req.user._id;
      rr.processedAt = new Date();
      await rr.save({ session });

      await ActivityLog.create([{
        user: req.user._id,
        action: 'return_processed',
        entityType: 'ReturnRequest',
        entityId: rr._id,
        details: { module: rr.module, amount: rr.totalAmount }
      }], { session }).catch(() => {});

      if (rr.requestedBy) {
        await Notification.create([{
          user: rr.requestedBy,
          title: 'Return approved',
          message: `${rr.module} return for ₹${rr.totalAmount} was processed`,
          type: 'info'
        }], { session }).catch(() => {});
      }

      result = rr;
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

module.exports = { listReturns, createReturn, processReturn };
