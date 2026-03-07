const asyncHandler = require('express-async-handler');
const BaseAdmission = require('../models/NH_Admission');
const BaseInvoice = require('../models/NH_Invoice');
const BasePatient = require('../models/NH_Patient');
const BaseAppointment = require('../models/NH_Appointment');
const BaseBed = require('../models/NH_Bed');
const BasePrescription = require('../models/NH_Prescription');
const BaseDoctor = require('../models/NH_Doctor');
const BaseUser = require('../models/NH_User');
const BaseVital = require('../models/NH_Vital');
const { AppError } = require('../middleware/errorHandler');
const { getModel } = require('../utils/tenantModel');

const getModels = (req) => ({
    Admission: getModel(req, 'Admission', BaseAdmission),
    Invoice: getModel(req, 'Invoice', BaseInvoice),
    Patient: getModel(req, 'Patient', BasePatient),
    Appointment: getModel(req, 'Appointment', BaseAppointment),
    Bed: getModel(req, 'Bed', BaseBed),
    Prescription: getModel(req, 'Prescription', BasePrescription),
    Doctor: getModel(req, 'Doctor', BaseDoctor),
    User: getModel(req, 'User', BaseUser),
    Vital: getModel(req, 'Vital', BaseVital),
});

const applyDateRange = (match, field, startDate, endDate) => {
    if (!startDate && !endDate) return;
    const fieldMatch = {};
    if (startDate) fieldMatch.$gte = new Date(startDate);
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        fieldMatch.$lte = end;
    }
    match[field] = fieldMatch;
};

const parsePagination = (query) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));
    return { page, limit, skip: (page - 1) * limit };
};

// @desc    Get key performance indicators
// @route   GET /api/reports/kpis
// @access  Private
const getKpis = asyncHandler(async (req, res) => {
    const { Patient, Admission, Bed, Invoice, Appointment } = getModels(req);
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
    const { Invoice } = getModels(req);
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const match = { status: { $in: ['paid', 'partial'] } };
    applyDateRange(match, 'createdAt', startDate, endDate);

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
    const { Admission } = getModels(req);
    const { startDate, endDate } = req.query;
    const match = {};
    applyDateRange(match, 'admissionDate', startDate, endDate);

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

// @desc    Get prescriptions report
// @route   GET /api/reports/prescriptions
// @access  Private
const getPrescriptionsReport = asyncHandler(async (req, res) => {
    const { Prescription } = getModels(req);
    const { startDate, endDate, status, mode } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const query = {};
    if (status) query.status = status;
    if (mode) query.mode = mode;
    applyDateRange(query, 'createdAt', startDate, endDate);

    const [total, prescriptions, statusSummary] = await Promise.all([
        Prescription.countDocuments(query),
        Prescription.find(query)
            .populate('patient', 'firstName lastName patientId')
            .populate({
                path: 'doctor',
                select: 'name specialization user',
                populate: { path: 'user', select: 'firstName lastName email' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Prescription.aggregate([
            { $match: query },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ])
    ]);

    res.json({
        data: prescriptions,
        total,
        page,
        pages: Math.ceil(total / limit),
        summary: statusSummary
    });
});

// @desc    Get billing report
// @route   GET /api/reports/billing
// @access  Private
const getBillingReport = asyncHandler(async (req, res) => {
    const { Invoice } = getModels(req);
    const { startDate, endDate, status, type, billingScope } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (billingScope) query.billingScope = billingScope;
    applyDateRange(query, 'createdAt', startDate, endDate);

    const [total, invoices, totals] = await Promise.all([
        Invoice.countDocuments(query),
        Invoice.find(query)
            .populate('patient', 'firstName lastName patientId')
            .populate('generatedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Invoice.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: '$totalAmount' },
                    totalPaid: { $sum: '$paidAmount' },
                    totalDue: { $sum: '$dueAmount' },
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    res.json({
        data: invoices,
        total,
        page,
        pages: Math.ceil(total / limit),
        summary: totals[0] || { totalBilled: 0, totalPaid: 0, totalDue: 0, count: 0 }
    });
});

// @desc    Analyzer report (patient/doctor/nurse/medicine)
// @route   GET /api/reports/analyzer
// @access  Private
const getAnalyzerReport = asyncHandler(async (req, res) => {
    const { Invoice, Patient, Prescription, Doctor, User, Vital } = getModels(req);
    const { dimension = 'patient', startDate, endDate } = req.query;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    if (!['patient', 'doctor', 'nurse', 'medicine'].includes(dimension)) {
        throw new AppError('dimension must be one of patient, doctor, nurse, medicine', 400);
    }

    if (dimension === 'patient') {
        const match = { status: { $nin: ['cancelled', 'refunded'] } };
        applyDateRange(match, 'createdAt', startDate, endDate);

        const grouped = await Invoice.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        patient: '$patient',
                        externalName: '$externalPatientInfo.name'
                    },
                    invoiceCount: { $sum: 1 },
                    totalBilled: { $sum: '$totalAmount' },
                    totalPaid: { $sum: '$paidAmount' },
                    totalDue: { $sum: '$dueAmount' }
                }
            },
            { $sort: { totalBilled: -1 } },
            { $limit: limit }
        ]);

        const patientIds = grouped
            .map((row) => row._id?.patient)
            .filter(Boolean);
        const patients = await Patient.find({ _id: { $in: patientIds } })
            .select('firstName lastName patientId')
            .lean();
        const patientMap = new Map(
            patients.map((p) => [String(p._id), `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.patientId || 'Patient'])
        );

        const data = grouped.map((row) => {
            const patientId = row._id?.patient ? String(row._id.patient) : null;
            return {
                dimension: 'patient',
                key: patientId || row._id?.externalName || 'walk-in',
                label: patientId
                    ? (patientMap.get(patientId) || 'Patient')
                    : (row._id?.externalName || 'Walk-in'),
                invoiceCount: row.invoiceCount,
                totalBilled: row.totalBilled,
                totalPaid: row.totalPaid,
                totalDue: row.totalDue
            };
        });

        return res.json({ dimension, data });
    }

    if (dimension === 'doctor') {
        const match = {};
        applyDateRange(match, 'createdAt', startDate, endDate);

        const grouped = await Prescription.aggregate([
            { $match: match },
            { $match: { doctor: { $ne: null } } },
            {
                $group: {
                    _id: '$doctor',
                    prescriptionCount: { $sum: 1 },
                    totalItems: { $sum: { $size: { $ifNull: ['$items', []] } } }
                }
            },
            { $sort: { prescriptionCount: -1 } },
            { $limit: limit }
        ]);

        const doctorIds = grouped.map((row) => row._id).filter(Boolean);
        const doctors = await Doctor.find({ _id: { $in: doctorIds } })
            .select('name user specialization')
            .lean();
        const userIds = doctors.map((d) => d.user).filter(Boolean);
        const users = await User.find({ _id: { $in: userIds } })
            .select('firstName lastName email')
            .lean();
        const userMap = new Map(users.map((u) => [String(u._id), `${u.firstName || ''} ${u.lastName || ''}`.trim()]));
        const doctorMap = new Map(
            doctors.map((d) => [
                String(d._id),
                d.name || userMap.get(String(d.user)) || 'Doctor'
            ])
        );

        const data = grouped.map((row) => ({
            dimension: 'doctor',
            key: String(row._id),
            label: doctorMap.get(String(row._id)) || 'Doctor',
            prescriptionCount: row.prescriptionCount,
            totalItems: row.totalItems
        }));

        return res.json({ dimension, data });
    }

    if (dimension === 'nurse') {
        const match = {};
        applyDateRange(match, 'recordedAt', startDate, endDate);

        const grouped = await Vital.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$recordedBy',
                    vitalsRecorded: { $sum: 1 },
                    patientsCoveredSet: { $addToSet: '$patient' }
                }
            },
            {
                $project: {
                    vitalsRecorded: 1,
                    patientsCovered: { $size: '$patientsCoveredSet' }
                }
            },
            { $sort: { vitalsRecorded: -1 } },
            { $limit: limit }
        ]);

        const nurseIds = grouped.map((row) => row._id).filter(Boolean);
        const nurses = await User.find({ _id: { $in: nurseIds } })
            .select('firstName lastName email role')
            .lean();
        const nurseMap = new Map(
            nurses.map((n) => [String(n._id), `${n.firstName || ''} ${n.lastName || ''}`.trim() || n.email || 'Nurse'])
        );

        const data = grouped.map((row) => ({
            dimension: 'nurse',
            key: String(row._id),
            label: nurseMap.get(String(row._id)) || 'Nurse',
            vitalsRecorded: row.vitalsRecorded,
            patientsCovered: row.patientsCovered
        }));

        return res.json({ dimension, data });
    }

    const match = {};
    applyDateRange(match, 'createdAt', startDate, endDate);
    const data = await Prescription.aggregate([
        { $match: match },
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
        {
            $group: {
                _id: { $ifNull: ['$items.medicineName', 'Unknown Medicine'] },
                prescribedQty: { $sum: { $ifNull: ['$items.quantity', 0] } },
                dispensedQty: { $sum: { $ifNull: ['$items.dispensedQty', 0] } },
                prescriptionCount: { $sum: 1 }
            }
        },
        { $sort: { prescribedQty: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                dimension: 'medicine',
                key: '$_id',
                label: '$_id',
                prescribedQty: 1,
                dispensedQty: 1,
                prescriptionCount: 1
            }
        }
    ]);

    return res.json({ dimension, data });
});

module.exports = {
    getKpis,
    getFinancialReport,
    getAdmissionsReport,
    getPrescriptionsReport,
    getBillingReport,
    getAnalyzerReport
};
