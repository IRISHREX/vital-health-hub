const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const vitalController = require('../controllers/NH_vitalController');

// Nurses and doctors can create and read vitals
router.get('/patient/:patientId', authenticate, authorize('nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.getPatientVitals);
router.get('/patient/:patientId/latest', authenticate, authorize('nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.getLatestVital);
router.post('/', authenticate, authorize('nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.createVital);
router.get('/patient/:patientId/trends', authenticate, authorize('nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.getVitalTrends);

module.exports = router;
