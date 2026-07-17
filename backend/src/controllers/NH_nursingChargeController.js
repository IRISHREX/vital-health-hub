const mongoose = require('mongoose');
const NursingChargeBase = require('../models/NH_NursingCharge');
const BillingLedgerBase = require('../models/NH_BillingLedger');
const AdmissionBase = require('../models/NH_Admission');
const { getModel } = require('../utils/tenantModel');

const M = (req) => ({
  NursingCharge: getModel(req, 'NursingCharge', NursingChargeBase),
  BillingLedger: getModel(req, 'BillingLedger', BillingLedgerBase),
  Admission: getModel(req, 'Admission', AdmissionBase),
});

const listNursingCharges = async (req, res) => {
  try {
    const { NursingCharge } = M(req);
    const { admissionId, patientId, limit = 100 } = req.query;
    const q = {};
    if (admissionId) q.admission = admissionId;
    if (patientId) q.patient = patientId;
    const items = await NursingCharge.find(q).sort({ performedAt: -1 }).limit(Number(limit))
      .populate('performedBy', 'name role')
      .populate('serviceCatalog', 'name category');
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createNursingCharge = async (req, res) => {
  const { admission, patient, chargeType, serviceCatalog, description, quantity = 1, unitPrice, notes } = req.body;
  if (!admission || !chargeType || !description || unitPrice == null) {
    return res.status(400).json({ message: 'admission, chargeType, description, unitPrice are required' });
  }
  const { NursingCharge, BillingLedger, Admission } = M(req);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const adm = await Admission.findById(admission).session(session);
      if (!adm) throw new Error('Admission not found');
      const patientId = patient || adm.patient;
      const qty = Number(quantity) || 1;
      const price = Number(unitPrice);
      const amount = qty * price;
      const [charge] = await NursingCharge.create([{
        admission, patient: patientId, chargeType, serviceCatalog,
        description, quantity: qty, unitPrice: price, amount,
        performedBy: req.user._id, notes
      }], { session });
      const [ledger] = await BillingLedger.create([{
        admission,
        patient: patientId,
        sourceType: 'nursing',
        sourceId: charge._id,
        category: 'nursing',
        description,
        quantity: qty,
        unitPrice: price,
        amount,
        recordedBy: req.user._id
      }], { session });
      charge.ledgerEntry = ledger._id;
      await charge.save({ session });
      result = charge;
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

const cancelNursingCharge = async (req, res) => {
  const { NursingCharge, BillingLedger } = M(req);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const charge = await NursingCharge.findById(req.params.id).session(session);
      if (!charge) throw new Error('Not found');
      if (charge.cancelled) throw new Error('Already cancelled');
      if (charge.ledgerEntry) {
        const led = await BillingLedger.findById(charge.ledgerEntry).session(session);
        if (led && led.billed) throw new Error('Charge already billed on an invoice — issue a return instead');
        if (led) await led.deleteOne({ session });
      }
      charge.cancelled = true;
      charge.cancelledAt = new Date();
      charge.cancelledBy = req.user._id;
      charge.cancelReason = req.body?.reason;
      await charge.save({ session });
      result = charge;
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

module.exports = { listNursingCharges, createNursingCharge, cancelNursingCharge };
