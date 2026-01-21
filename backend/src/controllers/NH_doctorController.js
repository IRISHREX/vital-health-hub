const { Doctor, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Private
exports.getDoctors = async (req, res, next) => {
  try {
    const { department, specialization, availabilityStatus, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (department) query.department = department;
    if (specialization) query.specialization = specialization;
    if (availabilityStatus) query.availabilityStatus = availabilityStatus;

    const doctors = await Doctor.find(query)
      .populate('user', 'firstName lastName email phone avatar isActive')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ department: 1 });

    // Apply search filter on populated fields
    let filteredDoctors = doctors;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDoctors = doctors.filter(doc => 
        doc.user?.firstName?.toLowerCase().includes(searchLower) ||
        doc.user?.lastName?.toLowerCase().includes(searchLower) ||
        doc.doctorId?.toLowerCase().includes(searchLower) ||
        doc.specialization?.toLowerCase().includes(searchLower)
      );
    }

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      data: {
        doctors: filteredDoctors,
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

// @desc    Get doctor stats
// @route   GET /api/doctors/stats
// @access  Private
exports.getDoctorStats = async (req, res, next) => {
  try {
    const total = await Doctor.countDocuments();
    const available = await Doctor.countDocuments({ availabilityStatus: 'available' });
    const onLeave = await Doctor.countDocuments({ availabilityStatus: 'on_leave' });

    // By department
    const byDepartment = await Doctor.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$availabilityStatus', 'available'] }, 1, 0] }
          }
        }
      }
    ]);

    // By specialization
    const bySpecialization = await Doctor.aggregate([
      {
        $group: {
          _id: '$specialization',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        total,
        available,
        onLeave,
        byDepartment,
        bySpecialization
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single doctor
// @route   GET /api/doctors/:id
// @access  Private
exports.getDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('user', 'firstName lastName email phone avatar address');
    
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    res.json({
      success: true,
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create doctor profile
// @route   POST /api/doctors
// @access  Admin
exports.createDoctor = async (req, res, next) => {
  try {
    const { name, email, phone, specialization, department, qualification, experience, consultationFee, availabilityStatus } = req.body;

    // Validate required fields
    if (!name || !specialization || !department || !qualification) {
      throw new AppError('Please provide all required fields', 400);
    }
    
    // Create doctor without user initially (will be linked later)
    const doctor = await Doctor.create({
      name,
      email,
      phone,
      specialization,
      department,
      qualification,
      experience: experience || 0,
      consultationFee: {
        opd: consultationFee || 500,
        ipd: (consultationFee || 500) * 2
      },
      availabilityStatus: availabilityStatus || 'available'
    });

    res.status(201).json({
      success: true,
      message: 'Doctor profile created successfully',
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
// @access  Admin/Doctor (own profile)
exports.updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email phone avatar');

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    res.json({
      success: true,
      message: 'Doctor profile updated',
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete doctor
// @route   DELETE /api/doctors/:id
// @access  Admin
exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    await doctor.remove();

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor schedule
// @route   PUT /api/doctors/:id/schedule
// @access  Admin/Doctor
exports.updateSchedule = async (req, res, next) => {
  try {
    const { schedule } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { schedule },
      { new: true }
    );

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: { schedule: doctor.schedule }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update availability status
// @route   PATCH /api/doctors/:id/availability
// @access  Admin/Doctor
exports.updateAvailability = async (req, res, next) => {
  try {
    const { availabilityStatus } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { availabilityStatus },
      { new: true }
    ).populate('user', 'firstName lastName');

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    res.json({
      success: true,
      message: 'Availability updated',
      data: { doctor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add leave schedule
// @route   POST /api/doctors/:id/leave
// @access  Admin/Doctor
exports.addLeave = async (req, res, next) => {
  try {
    const { startDate, endDate, reason } = req.body;

    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    doctor.leaveSchedule.push({ startDate, endDate, reason });
    await doctor.save();

    res.json({
      success: true,
      message: 'Leave added successfully',
      data: { leaveSchedule: doctor.leaveSchedule }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's available doctors
// @route   GET /api/doctors/available-today
// @access  Private
exports.getAvailableToday = async (req, res, next) => {
  try {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'lowercase' });

    const doctors = await Doctor.find({
      availabilityStatus: 'available',
      'schedule.day': dayName,
      'schedule.isAvailable': true
    }).populate('user', 'firstName lastName avatar department');

    res.json({
      success: true,
      data: { doctors }
    });
  } catch (error) {
    next(error);
  }
};