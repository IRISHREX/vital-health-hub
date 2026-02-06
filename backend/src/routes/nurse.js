const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const nurseController = require('../controllers/NH_nurseController');

// Nurse-specific endpoints
router.get('/patients', authenticate, authorize('nurse', 'head_nurse', 'hospital_admin', 'super_admin', 'doctor'), nurseController.getAssignedPatients);
router.get('/appointments', authenticate, authorize('nurse', 'head_nurse', 'hospital_admin', 'super_admin', 'doctor'), nurseController.getAssignedAppointments);
router.post('/assign-room', authenticate, authorize('nurse', 'head_nurse', 'hospital_admin', 'super_admin', 'doctor'), nurseController.assignRoomToNurse);
router.post('/handover', authenticate, authorize('nurse', 'head_nurse', 'hospital_admin', 'super_admin', 'doctor'), nurseController.handoverPatient);
router.post('/patients/:id/status', authenticate, authorize('nurse', 'head_nurse', 'hospital_admin', 'super_admin'), nurseController.updatePatientStatus);

module.exports = router;
