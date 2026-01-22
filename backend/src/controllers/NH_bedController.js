const { Bed, Patient, Admission } = require('../models');
const { emitBedUpdate } = require('../config/socket');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all beds
// @route   GET /api/beds
// @access  Private
exports.getBeds = async (req, res, next) => {
  try {
    const { status, bedType, ward, floor, page = 1, limit = 50 } = req.query;
    
    const query = { isActive: true };
    
    if (status) query.status = status;
    if (bedType) query.bedType = bedType;
    if (ward) query.ward = ward;
    if (floor) query.floor = parseInt(floor);

    const total = await Bed.countDocuments(query);
    const beds = await Bed.find(query)
      .populate('currentPatient', 'firstName lastName patientId')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ ward: 1, floor: 1, bedNumber: 1 });

    res.json({
      success: true,
      data: {
        beds,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bed statistics
// @route   GET /api/beds/stats
// @access  Private
exports.getBedStats = async (req, res, next) => {
  try {
    const total = await Bed.countDocuments({ isActive: true });
    const available = await Bed.countDocuments({ status: 'available', isActive: true });
    const occupied = await Bed.countDocuments({ status: 'occupied', isActive: true });
    const cleaning = await Bed.countDocuments({ status: 'cleaning', isActive: true });
    const reserved = await Bed.countDocuments({ status: 'reserved', isActive: true });
    const maintenance = await Bed.countDocuments({ status: 'maintenance', isActive: true });

    // By bed type
    const byType = await Bed.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$bedType',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          occupied: {
            $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] }
          }
        }
      }
    ]);

    // By ward
    const byWard = await Bed.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$ward',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          occupied: {
            $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total,
        available,
        occupied,
        cleaning,
        reserved,
        maintenance,
        occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(1) : 0,
        byType,
        byWard
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bed
// @route   GET /api/beds/:id
// @access  Private
exports.getBed = async (req, res, next) => {
  try {
    const bed = await Bed.findById(req.params.id)
      .populate('currentPatient')
      .populate('currentAdmission');
    
    if (!bed) {
      throw new AppError('Bed not found', 404);
    }

    res.json({
      success: true,
      data: { bed }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create bed
// @route   POST /api/beds
// @access  Admin
exports.createBed = async (req, res, next) => {
  try {
    const bed = await Bed.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Bed created successfully',
      data: { bed }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bed
// @route   PUT /api/beds/:id
// @access  Admin
exports.updateBed = async (req, res, next) => {
  try {
    const { currentPatient } = req.body;
    const bed = await Bed.findById(req.params.id);

    if (!bed) {
      throw new AppError('Bed not found', 404);
    }

    // If patient assignment is changing
    if (currentPatient !== bed.currentPatient?.toString()) {
      // Update old patient if it exists
      if (bed.currentPatient) {
        await Patient.findByIdAndUpdate(
          bed.currentPatient,
          { assignedBed: null },
          { new: true }
        );
      }

      // Update new patient if provided
      if (currentPatient) {
        await Patient.findByIdAndUpdate(
          currentPatient,
          { assignedBed: bed._id },
          { new: true }
        );
      }
    }

    const updatedBed = await Bed.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('currentPatient', 'firstName lastName patientId');

    // Emit real-time update
    emitBedUpdate(updatedBed);

    res.json({
      success: true,
      message: 'Bed updated successfully',
      data: { bed: updatedBed }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bed status
// @route   PATCH /api/beds/:id/status
// @access  Private
exports.updateBedStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const bed = await Bed.findByIdAndUpdate(
      req.params.id,
      { status, lastCleaned: status === 'available' ? new Date() : undefined },
      { new: true }
    ).populate('currentPatient', 'firstName lastName patientId');

    if (!bed) {
      throw new AppError('Bed not found', 404);
    }

    // Emit real-time update
    emitBedUpdate(bed);

    res.json({
      success: true,
      message: 'Bed status updated',
      data: { bed }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign bed to patient
// @route   POST /api/beds/:id/assign
// @access  Private
exports.assignBed = async (req, res, next) => {
  try {
    const { patientId, admissionId } = req.body;

    const bed = await Bed.findById(req.params.id);
    
    if (!bed) {
      throw new AppError('Bed not found', 404);
    }

    if (bed.status !== 'available' && bed.status !== 'reserved') {
      throw new AppError('Bed is not available for assignment', 400);
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // Check if patient is not already admitted
    const activeAdmission = await Admission.findOne({
      patient: patientId,
      status: 'ADMITTED'
    });
    if (activeAdmission) {
      throw new AppError('Patient already has an active admission. Cannot assign bed until discharge.', 400);
    }

    bed.status = 'occupied';
    bed.currentPatient = patientId;
    bed.currentAdmission = admissionId;
    bed.lastOccupied = new Date();
    await bed.save();

    // Update patient's assignedBed but DO NOT change admission status
    // Admission status should only be updated when an actual admission record is created
    await Patient.findByIdAndUpdate(
      patientId,
      { assignedBed: bed._id },
      { new: true }
    );

    await bed.populate('currentPatient', 'firstName lastName patientId');

    // Emit real-time update
    emitBedUpdate(bed);

    res.json({
      success: true,
      message: 'Bed assigned successfully',
      data: { bed }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Release bed
// @route   POST /api/beds/:id/release
// @access  Private
exports.releaseBed = async (req, res, next) => {
  try {
    const bed = await Bed.findById(req.params.id);
    
    if (!bed) {
      throw new AppError('Bed not found', 404);
    }

    // Update patient status if there was one
    if (bed.currentPatient) {
      await Patient.findByIdAndUpdate(bed.currentPatient, { status: 'discharged' });
    }

    bed.status = 'cleaning';
    bed.currentPatient = null;
    bed.currentAdmission = null;
    await bed.save();

    // Emit real-time update
    emitBedUpdate(bed);

    res.json({
      success: true,
      message: 'Bed released for cleaning',
      data: { bed }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete bed
// @route   DELETE /api/beds/:id
// @access  Admin
exports.deleteBed = async (req, res, next) => {
  try {
    const bed = await Bed.findById(req.params.id);
    
    if (!bed) {
      throw new AppError('Bed not found', 404);
    }

    if (bed.status === 'occupied') {
      throw new AppError('Cannot delete an occupied bed', 400);
    }

    bed.isActive = false;
    await bed.save();

    res.json({
      success: true,
      message: 'Bed deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
