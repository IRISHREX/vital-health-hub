const { Vital, Patient, Notification, ActivityLog } = require('../models');
const { AppError } = require('../middleware/errorHandler');

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
    // Normalize payload to support quick-entry (flat) and nested schema shapes
    const vitalData = { ...req.body };

    // Support `patientId` alias
    if (!vitalData.patient && vitalData.patientId) {
      vitalData.patient = vitalData.patientId;
      delete vitalData.patientId;
    }

    // Normalize heart rate (number -> { value })
    if (typeof vitalData.heartRate === 'number') {
      vitalData.heartRate = { value: vitalData.heartRate };
    }

    // Normalize temperature (number -> { value })
    if (typeof vitalData.temperature === 'number') {
      vitalData.temperature = { value: vitalData.temperature };
    }

    // Normalize oxygen saturation (number -> { value })
    if (typeof vitalData.oxygenSaturation === 'number') {
      vitalData.oxygenSaturation = { value: vitalData.oxygenSaturation };
    }

    // Normalize respiratory rate (number -> { value })
    if (typeof vitalData.respiratoryRate === 'number') {
      vitalData.respiratoryRate = { value: vitalData.respiratoryRate };
    }

    // Normalize blood pressure:
    // - "120/80" string
    // - { systolic, diastolic } already ok
    if (typeof vitalData.bloodPressure === 'string') {
      const [systolicStr, diastolicStr] = vitalData.bloodPressure.split('/');
      const systolic = Number(systolicStr);
      const diastolic = Number(diastolicStr);
      if (!Number.isNaN(systolic) && !Number.isNaN(diastolic)) {
        vitalData.bloodPressure = { systolic, diastolic };
      }
    }

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
