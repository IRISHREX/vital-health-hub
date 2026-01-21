const asyncHandler = require('express-async-handler');
const Admission = require('../models/NH_Admission');
const Invoice = require('../models/NH_Invoice');
const Patient = require('../models/NH_Patient');
const Appointment = require('../models/NH_Appointment');
const Bed = require('../models/NH_Bed');

// @desc    Get key performance indicators
// @route   GET /api/reports/kpis
// @access  Private
const getKpis = asyncHandler(async (req, res) => {
    const totalPatients = await Patient.countDocuments();
    const totalAdmissions = await Admission.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newAdmissionsToday = await Admission.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
    const dischargedToday = await Admission.countDocuments({ dischargeDate: { $gte: today, $lt: tomorrow } });

    const totalBeds = await Bed.countDocuments();
    const occupiedBeds = await Bed.countDocuments({ isOccupied: true });
    const bedOccupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    const totalRevenue = await Invoice.aggregate([
        { $match: { status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    const appointmentsToday = await Appointment.countDocuments({
        appointmentDate: {
            $gte: today.toISOString().split('T')[0],
            $lte: today.toISOString().split('T')[0]
        }
    });


    res.json({
        totalPatients,
        totalAdmissions,
        newAdmissionsToday,
        dischargedToday,
        bedOccupancyRate: bedOccupancyRate.toFixed(2),
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        appointmentsToday
    });
});

// @desc    Get financial report
// @route   GET /api/reports/financial
// @access  Private
const getFinancialReport = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const match = { status: { $in: ['paid', 'partial'] } };
    if (startDate && endDate) {
        match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    let group;
    if(groupBy === 'month'){
        group = {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            totalRevenue: { $sum: '$paidAmount' },
            totalInvoices: { $sum: 1 }
        }
    } else { // default to day
        group = {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalRevenue: { $sum: '$paidAmount' },
            totalInvoices: { $sum: 1 }
        }
    }

    const financialData = await Invoice.aggregate([
        { $match: match },
        { $group: group },
        { $sort: { '_id': 1 } }
    ]);

    res.json(financialData);
});

// @desc    Get admissions report
// @route   GET /api/reports/admissions
// @access  Private
const getAdmissionsReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate && endDate) {
        match.admissionDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const admissionsData = await Admission.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$admissionDate' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
    res.json(admissionsData);
});


module.exports = {
    getKpis,
    getFinancialReport,
    getAdmissionsReport
};
