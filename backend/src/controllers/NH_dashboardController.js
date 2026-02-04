const { Appointment, Patient, Vital, User } = require('../models');

// Return role-specific dashboard summaries
exports.getDashboard = async (req, res, next) => {
  try {
    const roleQuery = req.query.role || req.user.role;

    // Admin view cards
    if (roleQuery === 'admin' && ['super_admin', 'hospital_admin'].includes(req.user.role)) {
      const totalPatients = await Patient.countDocuments();
      const totalAppointments = await Appointment.countDocuments();
      const totalVitals = await Vital.countDocuments();

      return res.json({
        success: true,
        data: {
          cards: [
            { key: 'admin', label: 'Admin View' },
            { key: 'doctor', label: 'Doctor View' },
            { key: 'nurse', label: 'Nurse View' }
          ],
          stats: { totalPatients, totalAppointments, totalVitals }
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
