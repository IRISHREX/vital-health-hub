const { Appointment, Doctor, Patient } = require('../models');
const { sendEmail } = require('../config/email');
const { emitNotification } = require('../config/socket');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
  try {
    const { doctorId, patientId, status, type, date, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (doctorId) query.doctor = doctorId;
    if (patientId) query.patient = patientId;
    if (status) query.status = status;
    if (type) query.type = type;
    
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: dayStart, $lte: dayEnd };
    } else if (startDate && endDate) {
      query.appointmentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName patientId phone')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ appointmentDate: 1, 'timeSlot.start': 1 });

    res.json({
      success: true,
      data: {
        appointments,
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

// @desc    Get today's appointments
// @route   GET /api/appointments/today
// @access  Private
exports.getTodayAppointments = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: today, $lt: tomorrow }
    })
      .populate('patient', 'firstName lastName patientId phone')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ 'timeSlot.start': 1 });

    res.json({
      success: true,
      data: { appointments }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get appointment stats
// @route   GET /api/appointments/stats
// @access  Private
exports.getAppointmentStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTotal = await Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow }
    });
    const todayCompleted = await Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });
    const todayPending = await Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // This week
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekTotal = await Appointment.countDocuments({
      appointmentDate: { $gte: weekStart }
    });

    // By status
    const byStatus = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        today: {
          total: todayTotal,
          completed: todayCompleted,
          pending: todayPending
        },
        weekTotal,
        byStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email phone' }
      });
    
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    res.json({
      success: true,
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res, next) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentTime, reason, notes, type, status, timeSlot } = req.body;

    // Validate patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // Validate doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    // Parse time slot - handle both old and new format
    let parsedDate = new Date(appointmentDate);
    let timeSlotObj = timeSlot;
    
    if (!timeSlotObj && appointmentTime) {
      // Convert appointmentTime to time slot format
      const [hours, minutes] = appointmentTime.split(':');
      parsedDate = new Date(appointmentDate);
      const endHours = parseInt(hours) + 1;
      timeSlotObj = {
        start: `${hours}:${minutes}`,
        end: `${endHours}:${minutes}`
      };
    }

    // Check for conflicting appointments
    const conflicting = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: {
        $gte: new Date(parsedDate.toDateString()),
        $lt: new Date(parsedDate.toDateString() + ' 23:59:59')
      },
      status: { $nin: ['cancelled', 'no_show'] }
    });

    if (conflicting && conflicting.timeSlot?.start === timeSlotObj?.start) {
      throw new AppError('This time slot is already booked', 400);
    }

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      appointmentDate: parsedDate,
      timeSlot: timeSlotObj || { start: '10:00', end: '10:30' },
      type: type || 'opd',
      reason: reason || '',
      notes: notes || '',
      status: status || 'scheduled',
      fee: type === 'opd' ? doctor.consultationFee?.opd || 500 : doctor.consultationFee?.ipd || 1000,
      createdBy: req.user._id
    });

    await appointment.populate('patient', 'firstName lastName email');
    await appointment.populate({
      path: 'doctor',
      populate: { path: 'user', select: 'firstName lastName' }
    });

    // Send confirmation email if patient has email
    if (patient.email) {
      await sendEmail(patient.email, 'appointmentConfirmation', {
        patient,
        appointment: {
          date: parsedDate.toLocaleDateString(),
          time: timeSlotObj?.start || appointmentTime,
          type
        },
        doctor: doctor.name || doctor.user?.firstName
      }).catch(err => console.log('Email not sent:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('patient', 'firstName lastName')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    res.json({
      success: true,
      message: 'Appointment updated',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PATCH /api/appointments/:id/status
// @access  Private
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, consultationNotes, prescription, followUpDate, cancelledReason } = req.body;

    const updateData = { status };
    if (consultationNotes) updateData.consultationNotes = consultationNotes;
    if (prescription) updateData.prescription = prescription;
    if (followUpDate) updateData.followUpDate = followUpDate;
    if (cancelledReason) {
      updateData.cancelledReason = cancelledReason;
      updateData.cancelledBy = req.user._id;
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('patient', 'firstName lastName');

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    res.json({
      success: true,
      message: 'Appointment status updated',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel appointment
// @route   POST /api/appointments/:id/cancel
// @access  Private
exports.cancelAppointment = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancelledReason: reason,
        cancelledBy: req.user._id
      },
      { new: true }
    );

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    res.json({
      success: true,
      message: 'Appointment cancelled',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Admin
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    await appointment.remove();

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor's schedule for a day
// @route   GET /api/appointments/schedule/:doctorId
// @access  Private
exports.getDoctorSchedule = async (req, res, next) => {
  try {
    const { date } = req.query;
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['cancelled', 'no_show'] }
    }).populate('patient', 'firstName lastName patientId');

    // Get day's schedule
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
    const schedule = doctor.schedule.find(s => s.day === dayName);

    res.json({
      success: true,
      data: {
        schedule,
        appointments,
        bookedSlots: appointments.map(a => a.timeSlot.start)
      }
    });
  } catch (error) {
    next(error);
  }
};