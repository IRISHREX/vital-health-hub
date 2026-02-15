const { Vital, Patient, Notification, ActivityLog } = require('../models');
const { AppError } = require('../middleware/errorHandler');

const normalizeVitalPayload = (body = {}) => {
  const vitalData = { ...body };

  if (!vitalData.patient && vitalData.patientId) {
    vitalData.patient = vitalData.patientId;
    delete vitalData.patientId;
  }

  if (typeof vitalData.heartRate === 'number') {
    vitalData.heartRate = { value: vitalData.heartRate };
  }

  if (typeof vitalData.temperature === 'number') {
    vitalData.temperature = { value: vitalData.temperature };
  }

  if (typeof vitalData.oxygenSaturation === 'number') {
    vitalData.oxygenSaturation = { value: vitalData.oxygenSaturation };
  }

  if (typeof vitalData.respiratoryRate === 'number') {
    vitalData.respiratoryRate = { value: vitalData.respiratoryRate };
  }

  if (typeof vitalData.bloodPressure === 'string') {
    const [systolicStr, diastolicStr] = vitalData.bloodPressure.split('/');
    const systolic = Number(systolicStr);
    const diastolic = Number(diastolicStr);
    if (!Number.isNaN(systolic) && !Number.isNaN(diastolic)) {
      vitalData.bloodPressure = { systolic, diastolic };
    }
  }

  return vitalData;
};

const canManageVital = (user, vital) => {
  if (!user || !vital) return false;
  if (['super_admin', 'hospital_admin', 'doctor', 'head_nurse'].includes(user.role)) return true;
  return vital.recordedBy?.toString() === user._id?.toString();
};

const getVitalPriority = (vital) => {
  const hr = vital?.heartRate?.value;
  const spo2 = vital?.oxygenSaturation?.value;
  const temp = vital?.temperature?.value;
  const sys = vital?.bloodPressure?.systolic;
  const dia = vital?.bloodPressure?.diastolic;

  const isUrgent = (spo2 !== undefined && spo2 < 90) ||
    (sys !== undefined && (sys > 180 || sys < 80)) ||
    (dia !== undefined && (dia > 120 || dia < 50)) ||
    (temp !== undefined && (temp > 103 || temp < 95)) ||
    (hr !== undefined && (hr > 130 || hr < 45));

  if (isUrgent) return 'urgent';

  const isHigh = !!(
    vital?.heartRate?.isAbnormal ||
    vital?.bloodPressure?.isAbnormal ||
    vital?.oxygenSaturation?.isAbnormal ||
    vital?.temperature?.isAbnormal ||
    vital?.respiratoryRate?.isAbnormal
  );

  return isHigh ? 'high' : 'normal';
};

// List vitals feed across patients with filters
exports.getVitalsFeed = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 200,
      startDate,
      endDate,
      search = '',
      priority = 'all',
      sort = 'desc',
      recordedBy
    } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) query.recordedAt.$gte = new Date(startDate);
      if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    if (recordedBy) {
      query.recordedBy = recordedBy;
    }

    const vitals = await Vital.find(query)
      .populate('patient', 'firstName lastName patientId')
      .populate('recordedBy', 'firstName lastName role')
      .sort({ recordedAt: sort === 'asc' ? 1 : -1 })
      .limit(Math.min(parseInt(limit, 10) * 5, 2000));

    const normalizedSearch = String(search || '').trim().toLowerCase();

    let enriched = vitals.map((v) => {
      const priorityLabel = getVitalPriority(v);
      const patientName = `${v?.patient?.firstName || ''} ${v?.patient?.lastName || ''}`.trim();
      return {
        ...v.toObject(),
        priorityLabel,
        patientName
      };
    });

    if (normalizedSearch) {
      enriched = enriched.filter((v) => {
        const patientName = String(v.patientName || '').toLowerCase();
        const patientId = String(v?.patient?.patientId || '').toLowerCase();
        return patientName.includes(normalizedSearch) || patientId.includes(normalizedSearch);
      });
    }

    if (priority && priority !== 'all') {
      enriched = enriched.filter((v) => v.priorityLabel === priority);
    }

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);
    const total = enriched.length;
    const pages = Math.max(Math.ceil(total / lim), 1);
    const start = (p - 1) * lim;
    const data = enriched.slice(start, start + lim);

    res.json({
      success: true,
      data: {
        vitals: data,
        pagination: { total, page: p, pages, limit: lim }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get vitals for a patient
exports.getPatientVitals = async (req, res, next) => {
  try {
    const { limit = 50, startDate, endDate } = req.query;

    const query = { patient: req.params.patientId };

    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) query.recordedAt.$gte = new Date(startDate);
      if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    const vitals = await Vital.find(query)
      .populate('recordedBy', 'firstName lastName')
      .sort('-recordedAt')
      .limit(parseInt(limit));

    res.json({ success: true, data: vitals });
  } catch (error) {
    next(error);
  }
};

// Get latest vital
exports.getLatestVital = async (req, res, next) => {
  try {
    const vital = await Vital.findOne({ patient: req.params.patientId })
      .populate('recordedBy', 'firstName lastName')
      .sort('-recordedAt');

    if (!vital) throw new AppError('No vitals found for this patient', 404);

    res.json({ success: true, data: vital });
  } catch (error) {
    next(error);
  }
};

// Create vital
exports.createVital = async (req, res, next) => {
  try {
    const vitalData = normalizeVitalPayload(req.body);

    // Attach recorder
    vitalData.recordedBy = req.user._id;

    const vital = await Vital.create(vitalData);

    // Check for critical values and create notifications
    const criticalAlerts = [];

    if (vital.heartRate.isAbnormal) {
      criticalAlerts.push({
        type: 'alert',
        title: 'Abnormal Heart Rate',
        message: `Heart rate: ${vital.heartRate.value} bpm`,
        priority: vital.heartRate.value < 50 || vital.heartRate.value > 120 ? 'urgent' : 'high',
        data: { entityType: 'patient', entityId: vital.patient }
      });
    }

    if (vital.bloodPressure.isAbnormal) {
      criticalAlerts.push({
        type: 'alert',
        title: 'Abnormal Blood Pressure',
        message: `BP: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`,
        priority: vital.bloodPressure.systolic > 180 || vital.bloodPressure.systolic < 80 ? 'urgent' : 'high',
        data: { entityType: 'patient', entityId: vital.patient }
      });
    }

    if (vital.oxygenSaturation.isAbnormal) {
      criticalAlerts.push({
        type: 'alert',
        title: 'Low Oxygen Saturation',
        message: `SpO2: ${vital.oxygenSaturation.value}%`,
        priority: vital.oxygenSaturation.value < 90 ? 'urgent' : 'high',
        data: { entityType: 'patient', entityId: vital.patient }
      });
    }

    if (vital.temperature.isAbnormal) {
      criticalAlerts.push({
        type: 'alert',
        title: 'Abnormal Temperature',
        message: `Temperature: ${vital.temperature.value}°F`,
        priority: vital.temperature.value > 103 || vital.temperature.value < 95 ? 'urgent' : 'high',
        data: { entityType: 'patient', entityId: vital.patient }
      });
    }

    // Create notifications for critical values
    if (criticalAlerts.length > 0) {
      // For now create notifications for patient's primary nurse if assigned, otherwise for admin
      const patient = await Patient.findById(vital.patient).select('primaryNurse');

      const recipientIds = [];
      if (patient && patient.primaryNurse) recipientIds.push(patient.primaryNurse);

      if (recipientIds.length === 0) {
        // fallback to admins
        // No recipient discovery logic here; keep notification without recipient
      }

      if (recipientIds.length > 0) {
        await Promise.all(criticalAlerts.map(a => (
          Notification.create({
            recipient: recipientIds[0],
            type: a.type,
            title: a.title,
            message: a.message,
            priority: a.priority,
            data: a.data
          })
        )));
      }

      const hasCritical = criticalAlerts.some(a => a.priority === 'urgent');
      if (hasCritical) {
        await Patient.findByIdAndUpdate(vital.patient, { status: 'admitted' });
      }
    }

    // Log activity
    await ActivityLog.create({
      action: 'vital_recorded',
      description: 'Vital signs recorded for patient',
      user: req.user._id,
      patient: vital.patient,
      metadata: {
        heartRate: vital.heartRate.value,
        bloodPressure: `${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic}`,
        temperature: vital.temperature.value,
        oxygenSaturation: vital.oxygenSaturation.value
      }
    });

    res.status(201).json({ success: true, data: vital, alerts: criticalAlerts.length > 0 ? criticalAlerts : undefined });
  } catch (error) {
    next(error);
  }
};

// Update vital
exports.updateVital = async (req, res, next) => {
  try {
    const vital = await Vital.findById(req.params.id);
    if (!vital) throw new AppError('Vital not found', 404);
    if (!canManageVital(req.user, vital)) throw new AppError('Unauthorized', 403);

    const payload = normalizeVitalPayload(req.body);
    const allowed = ['heartRate', 'bloodPressure', 'temperature', 'oxygenSaturation', 'respiratoryRate', 'notes', 'recordedAt', 'patient'];
    allowed.forEach((key) => {
      if (payload[key] !== undefined) {
        vital[key] = payload[key];
      }
    });

    await vital.save();

    res.json({ success: true, data: vital });
  } catch (error) {
    next(error);
  }
};

// Delete vital
exports.deleteVital = async (req, res, next) => {
  try {
    const vital = await Vital.findById(req.params.id);
    if (!vital) throw new AppError('Vital not found', 404);
    if (!canManageVital(req.user, vital)) throw new AppError('Unauthorized', 403);

    await Vital.findByIdAndDelete(vital._id);
    res.json({ success: true, message: 'Vital deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Vital trends
exports.getVitalTrends = async (req, res, next) => {
  try {
    const { hours = 24 } = req.query;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const vitals = await Vital.find({ patient: req.params.patientId, recordedAt: { $gte: startTime } }).sort('recordedAt');

    const trends = vitals.map(v => ({
      time: v.recordedAt,
      heartRate: v.heartRate.value,
      systolic: v.bloodPressure.systolic,
      diastolic: v.bloodPressure.diastolic,
      temperature: v.temperature.value,
      oxygenSaturation: v.oxygenSaturation.value,
      respiratoryRate: v.respiratoryRate?.value
    }));

    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};
