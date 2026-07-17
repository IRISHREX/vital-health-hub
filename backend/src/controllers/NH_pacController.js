const PACRequestBase = require('../models/NH_PACRequest');
const SurgeryBase = require('../models/NH_Surgery');
const NotificationBase = require('../models/NH_Notification');
const { getModel } = require('../utils/tenantModel');

const M = (req) => ({
  PACRequest: getModel(req, 'PACRequest', PACRequestBase),
  Surgery: getModel(req, 'Surgery', SurgeryBase),
  Notification: getModel(req, 'Notification', NotificationBase),
});

const listPAC = async (req, res) => {
  try {
    const { PACRequest } = M(req);
    const { status, surgeryId, patientId } = req.query;
    const q = {};
    if (status) q.status = status;
    if (surgeryId) q.surgery = surgeryId;
    if (patientId) q.patient = patientId;
    const items = await PACRequest.find(q).sort({ createdAt: -1 })
      .populate('patient', 'firstName lastName')
      .populate('surgery', 'surgeryType scheduledAt')
      .populate('anesthetist', 'name');
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createPAC = async (req, res) => {
  try {
    const { PACRequest, Surgery, Notification } = M(req);
    const { surgery, anesthetist, scheduledFor, assessment, admission } = req.body;
    if (!surgery) return res.status(400).json({ message: 'surgery required' });
    const surg = await Surgery.findById(surgery);
    if (!surg) return res.status(404).json({ message: 'Surgery not found' });
    const doc = await PACRequest.create({
      pacNo: `PAC-${Date.now().toString(36).toUpperCase()}`,
      surgery,
      patient: surg.patient,
      admission: admission || surg.admission,
      anesthetist,
      scheduledFor,
      assessment,
      requestedBy: req.user._id
    });
    if (anesthetist) {
      await Notification.create({
        user: anesthetist,
        title: 'PAC request assigned',
        message: `New PAC request ${doc.pacNo}`,
        type: 'info'
      }).catch(() => {});
    }
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updatePAC = async (req, res) => {
  try {
    const { PACRequest } = M(req);
    const p = await PACRequest.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    const { assessment, status, scheduledFor, anesthetist } = req.body;
    if (assessment) p.assessment = { ...(p.assessment || {}), ...assessment };
    if (status) p.status = status;
    if (scheduledFor) p.scheduledFor = scheduledFor;
    if (anesthetist) p.anesthetist = anesthetist;
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const clearancePAC = async (req, res) => {
  try {
    const { PACRequest } = M(req);
    const { status, conditions, notes } = req.body; // status: cleared|conditional|not_cleared
    const p = await PACRequest.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    p.clearance = {
      status,
      conditions,
      notes,
      signedBy: req.user._id,
      signedAt: new Date()
    };
    if (status === 'cleared' || status === 'conditional') p.status = 'cleared';
    else if (status === 'not_cleared') p.status = 'not_cleared';
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listPAC, createPAC, updatePAC, clearancePAC };
