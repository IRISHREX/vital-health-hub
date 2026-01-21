const express = require('express');
const router = express.Router();
const {
  createAdmission,
  transferPatient,
  dischargePatient,
  getAdmissions,
  getAdmission,
  getAdmissionStats
} = require('../controllers/NH_admissionController');
const { authenticate, authorize } = require('../middleware/auth');

// Middleware for all routes
router.use(authenticate);

// @route   GET /api/admissions/stats
// @desc    Get admission statistics
// @access  Private
router.get('/stats', getAdmissionStats);

// @route   GET /api/admissions
// @desc    Get all admissions
// @access  Private
router.get('/', getAdmissions);

// @route   GET /api/admissions/:id
// @desc    Get single admission
// @access  Private
router.get('/:id', getAdmission);

// @route   POST /api/admissions
// @desc    Create new admission
// @access  Private - Doctor/Nurse/Admin
router.post(
  '/',
  authorize('doctor', 'nurse', 'hospital_admin', 'super_admin'),
  createAdmission
);

// @route   POST /api/admissions/:admissionId/transfer
// @desc    Transfer patient to different bed
// @access  Private - Doctor/Nurse/Admin
router.post(
  '/:admissionId/transfer',
  authorize('doctor', 'nurse', 'hospital_admin', 'super_admin'),
  transferPatient
);

// @route   POST /api/admissions/:admissionId/discharge
// @desc    Discharge patient from admission
// @access  Private - Doctor/Admin
router.post(
  '/:admissionId/discharge',
  authorize('doctor', 'hospital_admin', 'super_admin'),
  dischargePatient
);

module.exports = router;
