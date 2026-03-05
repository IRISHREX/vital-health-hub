const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const vitalController = require('../controllers/NH_vitalController');

// Nurses and doctors can create and read vitals
router.get('/', authenticate, authorize('nurse', 'head_nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.getVitalsFeed);
router.get('/patient/:patientId', authenticate, authorize('nurse', 'head_nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.getPatientVitals);
router.get('/patient/:patientId/latest', authenticate, authorize('nurse', 'head_nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.getLatestVital);
router.post('/', authenticate, authorize('nurse', 'head_nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.createVital);
router.put('/:id', authenticate, authorize('nurse', 'head_nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.updateVital);
router.delete('/:id', authenticate, authorize('nurse', 'head_nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.deleteVital);
router.get('/patient/:patientId/trends', authenticate, authorize('nurse', 'head_nurse', 'doctor', 'hospital_admin', 'super_admin'), vitalController.getVitalTrends);

module.exports = router;
