const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const nurseController = require('../controllers/NH_nurseController');

// Nurse-specific endpoints
router.get('/patients', authenticate, authorize('nurse', 'hospital_admin', 'super_admin', 'doctor'), nurseController.getAssignedPatients);
router.get('/appointments', authenticate, authorize('nurse', 'hospital_admin', 'super_admin', 'doctor'), nurseController.getAssignedAppointments);
router.post('/patients/:id/status', authenticate, authorize('nurse', 'hospital_admin', 'super_admin'), nurseController.updatePatientStatus);

module.exports = router;
