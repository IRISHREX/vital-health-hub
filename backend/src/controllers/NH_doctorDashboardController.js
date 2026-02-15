const { Doctor, Appointment, Patient, Invoice, Prescription } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// Get doctor profile with stats
exports.getDoctorProfile = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findById(doctorId)
      .populate('user', 'firstName lastName email phone avatar department address');
    if (!doctor) throw new AppError('Doctor not found', 404);

    // Stats
    const totalAppointments = await Appointment.countDocuments({ doctor: doctorId });
    const completedAppointments = await Appointment.countDocuments({ doctor: doctorId, status: 'completed' });
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const todayAppointments = await Appointment.countDocuments({ doctor: doctorId, appointmentDate: { $gte: todayStart, $lte: todayEnd } });

    // Unique patients
    const uniquePatients = await Appointment.distinct('patient', { doctor: doctorId });

    // Revenue from invoices linked to this doctor
    const revenueAgg = await Invoice.aggregate([
      { $match: { doctor: doctor._id } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalPaid: { $sum: '$paidAmount' }, totalDue: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } }
    ]);
    const revenue = revenueAgg[0] || { totalRevenue: 0, totalPaid: 0, totalDue: 0 };

    // Recent appointments (work history)
    const recentAppointments = await Appointment.find({ doctor: doctorId })
      .populate('patient', 'firstName lastName patientId')
      .sort({ appointmentDate: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: {
        doctor,
        stats: {
          totalAppointments,
          completedAppointments,
          todayAppointments,
          totalPatients: uniquePatients.length,
          ...revenue
        },
        recentAppointments
      }
    });
  } catch (error) { next(error); }
};

// Get doctor revenue breakdown
exports.getDoctorRevenue = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const { period = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const revenue = await Invoice.aggregate([
      { $match: { doctor: require('mongoose').Types.ObjectId(doctorId), createdAt: { $gte: daysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: revenue });
  } catch (error) { next(error); }
};
