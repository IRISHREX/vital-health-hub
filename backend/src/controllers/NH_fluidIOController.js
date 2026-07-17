const FluidIOBase = require('../models/NH_FluidIO');
const { getModel } = require('../utils/tenantModel');

const M = (req) => ({ FluidIO: getModel(req, 'FluidIO', FluidIOBase) });

const listIO = async (req, res) => {
  try {
    const { FluidIO } = M(req);
    const { admissionId, from, to, limit = 500 } = req.query;
    if (!admissionId) return res.status(400).json({ message: 'admissionId required' });
    const q = { admission: admissionId };
    if (from || to) {
      q.ts = {};
      if (from) q.ts.$gte = new Date(from);
      if (to) q.ts.$lte = new Date(to);
    }
    const items = await FluidIO.find(q).sort({ ts: -1 }).limit(Number(limit))
      .populate('recordedBy', 'name role');
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createIO = async (req, res) => {
  try {
    const { FluidIO } = M(req);
    const { admission, patient, ts, direction, source, volumeMl, notes } = req.body;
    if (!admission || !direction || !source || volumeMl == null) {
      return res.status(400).json({ message: 'admission, direction, source, volumeMl required' });
    }
    const doc = await FluidIO.create({
      admission, patient, ts: ts || new Date(), direction, source,
      volumeMl: Number(volumeMl), notes, recordedBy: req.user._id
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteIO = async (req, res) => {
  try {
    const { FluidIO } = M(req);
    const doc = await FluidIO.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    await doc.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const summaryIO = async (req, res) => {
  try {
    const { FluidIO } = M(req);
    const { admissionId, from, to } = req.query;
    if (!admissionId) return res.status(400).json({ message: 'admissionId required' });
    const match = { admission: new (require('mongoose')).Types.ObjectId(admissionId) };
    if (from || to) {
      match.ts = {};
      if (from) match.ts.$gte = new Date(from);
      if (to) match.ts.$lte = new Date(to);
    }
    const agg = await FluidIO.aggregate([
      { $match: match },
      { $group: {
        _id: { direction: '$direction', source: '$source' },
        totalMl: { $sum: '$volumeMl' },
        count: { $sum: 1 }
      } }
    ]);
    const totals = { in: 0, out: 0, bySource: {} };
    for (const row of agg) {
      totals[row._id.direction] += row.totalMl;
      totals.bySource[row._id.source] = (totals.bySource[row._id.source] || 0) + row.totalMl;
    }
    totals.balance = totals.in - totals.out;
    res.json(totals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listIO, createIO, deleteIO, summaryIO };
