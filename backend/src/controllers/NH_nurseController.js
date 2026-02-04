const { Patient, Appointment } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// Get patients assigned to this nurse (supports admin/doctor requesting a specific nurse via ?nurseId=)
exports.getAssignedPatients = async (req, res, next) => {
  try {
    const requestedNurseId = req.query.nurseId;
    let nurseIdToUse = req.user._id;

    if (requestedNurseId) {
      // Only admin/hospital_admin/doctor can query other nurses
      if (!['super_admin','hospital_admin','doctor'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      nurseIdToUse = requestedNurseId;
    }

    const patients = await Patient.find({ assignedNurses: nurseIdToUse });
    res.json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

// Get appointments assigned to this nurse (supports admin/doctor requesting a specific nurse via ?nurseId=)
exports.getAssignedAppointments = async (req, res, next) => {
  try {
    const requestedNurseId = req.query.nurseId;
    let nurseIdToUse = req.user._id;

    if (requestedNurseId) {
      if (!['super_admin','hospital_admin','doctor'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      nurseIdToUse = requestedNurseId;
    }

    const appointments = await Appointment.find({ assignedNurse: nurseIdToUse })
      .populate('patient', 'firstName lastName patientId')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } });

    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// Update patient status (nurse action)
exports.updatePatientStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'admitted', 'discharged', 'critical', 'inactive'];
    if (!allowed.includes(status)) throw new AppError('Invalid status', 400);

    const patient = await Patient.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!patient) throw new AppError('Patient not found', 404);

    res.json({ success: true, message: 'Patient status updated', data: patient });
  } catch (error) {
    next(error);
  }
};
