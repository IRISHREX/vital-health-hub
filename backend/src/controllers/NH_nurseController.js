const { Patient, Appointment, User, Bed, Prescription } = require('../models');
const { AppError } = require('../middleware/errorHandler');

const canQueryOtherNurses = (role) => ['super_admin', 'hospital_admin', 'doctor', 'head_nurse'].includes(role);

const getNurseScope = (req) => {
  const requestedNurseId = req.query.nurseId;
  if (!requestedNurseId) return req.user._id;
  if (!canQueryOtherNurses(req.user.role)) {
    throw new AppError('Unauthorized', 403);
  }
  return requestedNurseId;
};

const getBedAssignedPatientIds = async (nurseId) => {
  const beds = await Bed.find({
    nurseInCharge: nurseId,
    currentPatient: { $ne: null }
  }).select('currentPatient _id');

  const patientIds = beds.map((b) => b.currentPatient).filter(Boolean);
  const bedIds = beds.map((b) => b._id);
  return { patientIds, bedIds };
};

const isPatientAssignedToNurse = async (patient, nurseId) => {
  const byPatient =
    (patient.assignedNurses || []).some((id) => id.toString() === nurseId.toString()) ||
    (patient.primaryNurse && patient.primaryNurse.toString() === nurseId.toString());

  if (byPatient) return true;
  if (!patient.assignedBed) return false;

  const bed = await Bed.findById(patient.assignedBed).select('nurseInCharge');
  return !!(bed?.nurseInCharge && bed.nurseInCharge.toString() === nurseId.toString());
};

// Get patients assigned to this nurse (supports admin/doctor requesting a specific nurse via ?nurseId=)
exports.getAssignedPatients = async (req, res, next) => {
  try {
    const nurseIdToUse = getNurseScope(req);
    const { patientIds, bedIds } = await getBedAssignedPatientIds(nurseIdToUse);

    const patients = await Patient.find({
      $or: [
        { assignedNurses: nurseIdToUse },
        { primaryNurse: nurseIdToUse },
        { _id: { $in: patientIds } },
        { assignedBed: { $in: bedIds } }
      ]
    }).sort('-updatedAt');
    res.json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

// Get appointments assigned to this nurse (supports admin/doctor requesting a specific nurse via ?nurseId=)
exports.getAssignedAppointments = async (req, res, next) => {
  try {
    const nurseIdToUse = getNurseScope(req);

    const appointments = await Appointment.find({ assignedNurse: nurseIdToUse })
      .populate('patient', 'firstName lastName patientId')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } });

    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// Get prescriptions for a patient assigned to this nurse
exports.getAssignedPatientPrescriptions = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findById(patientId).select('assignedNurses primaryNurse');
    if (!patient) throw new AppError('Patient not found', 404);

    const isPrivileged = ['super_admin', 'hospital_admin', 'doctor', 'head_nurse'].includes(req.user.role);
    const isAssigned = await isPatientAssignedToNurse(patient, req.user._id);

    if (!isPrivileged && !isAssigned) {
      throw new AppError('You are not assigned to this patient', 403);
    }

    const prescriptions = await Prescription.find({ patient: patientId })
      .populate('patient', 'firstName lastName patientId gender')
      .populate('doctor', 'firstName lastName specialization name user')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName email' } })
      .populate('items.medicine', 'name sellingPrice stock')
      .sort('-createdAt');

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    next(error);
  }
};

// Assign a room (ward + floor + roomNumber) to a nurse
exports.assignRoomToNurse = async (req, res, next) => {
  try {
    const { nurseId, ward, floor, roomNumber } = req.body;

    if (!nurseId || !ward || floor === undefined || floor === null || !roomNumber) {
      throw new AppError('nurseId, ward, floor, and roomNumber are required', 400);
    }

    const nurse = await User.findById(nurseId);
    if (!nurse) {
      throw new AppError('Nurse not found', 404);
    }
    if (!['nurse', 'head_nurse'].includes(nurse.role)) {
      throw new AppError('User is not a nurse', 400);
    }

    const roomExists = await Bed.exists({ ward, floor: Number(floor), roomNumber });
    if (!roomExists) {
      throw new AppError('No beds found for this ward/floor/roomNumber', 400);
    }

    const updatedNurse = await User.findByIdAndUpdate(
      nurseId,
      { $addToSet: { assignedRooms: { ward, floor: Number(floor), roomNumber } } },
      { new: true }
    ).select('firstName lastName role assignedRooms');

    res.json({
      success: true,
      message: 'Room assigned to nurse',
      data: { nurse: updatedNurse }
    });
  } catch (error) {
    next(error);
  }
};

// Handover patient to another nurse
exports.handoverPatient = async (req, res, next) => {
  try {
    const { patientId, toNurseId } = req.body;

    if (!patientId || !toNurseId) {
      throw new AppError('patientId and toNurseId are required', 400);
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    const targetNurse = await User.findById(toNurseId).select('role');
    if (!targetNurse || !['nurse', 'head_nurse'].includes(targetNurse.role)) {
      throw new AppError('Target nurse is invalid', 400);
    }

    const isPrivileged = ['super_admin', 'hospital_admin', 'doctor', 'head_nurse'].includes(req.user.role);
    const isAssigned = (patient.assignedNurses || []).some((id) => id.toString() === req.user._id.toString()) ||
      (patient.primaryNurse && patient.primaryNurse.toString() === req.user._id.toString());

    if (!isPrivileged && !isAssigned) {
      throw new AppError('You are not assigned to this patient', 403);
    }

    const currentAssigned = (patient.assignedNurses || []).map((id) => id.toString());
    let nextAssigned = currentAssigned.slice();

    if (!isPrivileged) {
      // If a nurse is handing over, remove themselves from assigned list
      nextAssigned = nextAssigned.filter((id) => id !== req.user._id.toString());
    }

    if (!nextAssigned.includes(toNurseId.toString())) {
      nextAssigned.push(toNurseId.toString());
    }

    const updates = { assignedNurses: nextAssigned };
    if (!patient.primaryNurse || (!isPrivileged && patient.primaryNurse.toString() === req.user._id.toString())) {
      updates.primaryNurse = toNurseId;
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      updates,
      { new: true }
    ).populate('assignedNurses', 'firstName lastName email')
     .populate('primaryNurse', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Patient handed over successfully',
      data: { patient: updatedPatient }
    });
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
