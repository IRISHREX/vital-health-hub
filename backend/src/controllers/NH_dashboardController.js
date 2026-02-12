const { Appointment, Patient, Vital, User, Doctor, Bed, Admission, Invoice } = require('../models');

// Return role-specific dashboard summaries
exports.getDashboard = async (req, res, next) => {
  try {
    const roleQuery = req.query.role || req.user.role;

    // Admin view cards
    if (roleQuery === 'admin' && ['super_admin', 'hospital_admin'].includes(req.user.role)) {
      const totalPatients = await Patient.countDocuments();
      const totalAppointments = await Appointment.countDocuments();
      const totalVitals = await Vital.countDocuments();
      const totalBeds = await Bed.countDocuments({ isActive: true });
      const availableBeds = await Bed.countDocuments({ isActive: true, status: 'available' });
      const admittedPatients = await Admission.countDocuments({ status: 'ADMITTED' });
      const availableDoctors = await Doctor.countDocuments({ availabilityStatus: 'available' });

      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date();
      dayEnd.setHours(23, 59, 59, 999);

      const todayAppointments = await Appointment.countDocuments({
        appointmentDate: { $gte: dayStart, $lte: dayEnd }
      });
      const todayDischarges = await Admission.countDocuments({
        actualDischargeDate: { $gte: dayStart, $lte: dayEnd }
      });

      const pendingBills = await Invoice.countDocuments({
        status: { $nin: ['cancelled', 'refunded'] },
        $expr: { $gt: ['$totalAmount', '$paidAmount'] }
      });

      const pendingRevenueResult = await Invoice.aggregate([
        {
          $match: {
            status: { $nin: ['cancelled', 'refunded'] }
          }
        },
        {
          $project: {
            due: {
              $max: [
                0,
                { $subtract: ['$totalAmount', '$paidAmount'] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalDue: { $sum: '$due' }
          }
        }
      ]);
      const pendingRevenue = pendingRevenueResult[0]?.totalDue || 0;
      const bedUtilizationRate = totalBeds > 0 ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 0;

      const doctorUpcomingAppointments = await Appointment.countDocuments({
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: { $gte: dayStart, $lte: dayEnd }
      });

      const totalNurses = await User.countDocuments({ role: 'nurse' });

      return res.json({
        success: true,
        data: {
          cards: [
            { key: 'admin', label: 'Admin View', value: totalPatients },
            { key: 'doctor', label: 'Doctor View', value: doctorUpcomingAppointments },
            { key: 'nurse', label: 'Nurse View', value: totalNurses }
          ],
          stats: {
            totalPatients,
            totalAppointments,
            totalVitals,
            totalBeds,
            availableBeds,
            admittedPatients,
            availableDoctors,
            pendingBills,
            todayAppointments,
            todayDischarges,
            bedUtilizationRate,
            pendingRevenue
          }
        }
      });
    }

    // Doctor view
    if (roleQuery === 'doctor' && (req.user.role === 'doctor' || ['super_admin', 'hospital_admin'].includes(req.user.role))) {
      const doctorId = req.user.role === 'doctor' ? req.user._id : null;

      const upcomingAppointments = await Appointment.countDocuments({ status: { $in: ['scheduled', 'confirmed'] } });
      const assignedPatients = await Patient.countDocuments({ assignedDoctor: doctorId });

      return res.json({ success: true, data: { upcomingAppointments, assignedPatients } });
    }

    // Nurse view
    if (roleQuery === 'nurse' && (req.user.role === 'nurse' || ['super_admin', 'hospital_admin', 'doctor'].includes(req.user.role))) {
      // For Admins and Doctors: Show Nurse Availability Overview
      if (['super_admin', 'hospital_admin', 'doctor'].includes(req.user.role)) {
        const nurses = await User.find({ role: 'nurse' })
          .select('firstName lastName email phone status department isActive avatar');

        const availableNurses = nurses.filter(n => n.status === 'active');
        const unavailableNurses = nurses.filter(n => n.status !== 'active');

        return res.json({
          success: true,
          data: {
            viewType: 'overview',
            stats: {
              total: nurses.length,
              available: availableNurses.length,
              unavailable: unavailableNurses.length
            },
            nurses: {
              available: availableNurses,
              unavailable: unavailableNurses
            }
          }
        });
      }

      const nurseId = req.user._id;
      const assignedPatients = await Patient.countDocuments({ assignedNurses: nurseId });
      const todaysAppointments = await Appointment.countDocuments({ assignedNurse: nurseId, appointmentDate: { $gte: new Date(new Date().setHours(0,0,0,0)), $lt: new Date(new Date().setHours(23,59,59,999)) } });
      const recentVitals = await Vital.countDocuments({ recordedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

      return res.json({ success: true, data: { assignedPatients, todaysAppointments, recentVitals } });
    }

    // Default unauthorized if role doesn't match
    return res.status(403).json({ success: false, message: 'Unauthorized for requested view' });
  } catch (error) {
    next(error);
  }
};
