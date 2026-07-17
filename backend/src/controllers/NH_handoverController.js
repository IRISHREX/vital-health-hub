const HandoverBase = require('../models/NH_Handover');
const NotificationBase = require('../models/NH_Notification');
const VitalBase = require('../models/NH_Vital');
const { getModel } = require('../utils/tenantModel');

const M = (req) => ({
  Handover: getModel(req, 'Handover', HandoverBase),
  Notification: getModel(req, 'Notification', NotificationBase),
  Vital: getModel(req, 'Vital', VitalBase),
});

const listHandovers = async (req, res) => {
  try {
    const { Handover } = M(req);
    const { status, mine, patientId, limit = 50 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (patientId) q.patient = patientId;
    if (mine === 'true') q.$or = [{ toNurse: req.user._id }, { fromNurse: req.user._id }];
    const items = await Handover.find(q).sort({ createdAt: -1 }).limit(Number(limit))
      .populate('patient', 'firstName lastName')
      .populate('fromNurse', 'name')
      .populate('toNurse', 'name');
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createHandover = async (req, res) => {
  try {
    const { Handover, Notification, Vital } = M(req);
    const {
      patient, admission, toNurse, shift,
      situation, background, assessment, recommendation,
      pendingTasks, activeIVs, activeMedications, alerts, allergies
    } = req.body;
    if (!patient || !toNurse) return res.status(400).json({ message: 'patient and toNurse required' });

    const lastVital = await Vital.findOne({ patient }).sort({ recordedAt: -1, createdAt: -1 }).lean();

    const doc = await Handover.create({
      handoverNo: `HO-${Date.now().toString(36).toUpperCase()}`,
      patient, admission,
      fromNurse: req.user._id, toNurse, shift,
      situation, background, assessment, recommendation,
      pendingTasks, activeIVs, activeMedications, alerts, allergies,
      vitalsSnapshot: lastVital || null
    });

    await Notification.create({
      user: toNurse,
      title: 'Patient handover request',
      message: `${req.user.name || 'A nurse'} sent you an SBAR handover`,
      type: 'info',
      link: `/nurse?handover=${doc._id}`
    }).catch(() => {});

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const respondHandover = async (req, res) => {
  try {
    const { Handover, Notification } = M(req);
    const { decision, notes } = req.body;
    const h = await Handover.findById(req.params.id);
    if (!h) return res.status(404).json({ message: 'Not found' });
    if (String(h.toNurse) !== String(req.user._id) && !['head_nurse', 'super_admin', 'hospital_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only the receiving nurse can respond' });
    }
    h.status = decision === 'accept' ? 'acknowledged' : 'rejected';
    h.respondedAt = new Date();
    h.responseNotes = notes;
    await h.save();

    await Notification.create({
      user: h.fromNurse,
      title: `Handover ${h.status}`,
      message: `Handover ${h.handoverNo} was ${h.status}`,
      type: h.status === 'acknowledged' ? 'success' : 'warning'
    }).catch(() => {});

    res.json(h);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listHandovers, createHandover, respondHandover };
