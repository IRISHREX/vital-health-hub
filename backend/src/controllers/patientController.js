const { Patient } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = async (req, res, next) => {
  try {
    const { status, registrationType, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (registrationType) query.registrationType = registrationType;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('registeredBy', 'firstName lastName')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        patients,
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

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('registeredBy', 'firstName lastName');
    
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    res.json({
      success: true,
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create patient
// @route   POST /api/patients
// @access  Private
exports.createPatient = async (req, res, next) => {
  try {
    const patientData = {
      ...req.body,
      registeredBy: req.user._id
    };

    const patient = await Patient.create(patientData);

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Admin
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    res.json({
      success: true,
      message: 'Patient deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient stats
// @route   GET /api/patients/stats
// @access  Private
exports.getPatientStats = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const admittedPatients = await Patient.countDocuments({ status: 'admitted' });
    const opdPatients = await Patient.countDocuments({ registrationType: 'opd', status: 'active' });
    
    // Today's registrations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRegistrations = await Patient.countDocuments({
      createdAt: { $gte: today }
    });

    // By gender
    const byGender = await Patient.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalPatients,
        admitted: admittedPatients,
        opd: opdPatients,
        todayRegistrations,
        byGender
      }
    });
  } catch (error) {
    next(error);
  }
};
