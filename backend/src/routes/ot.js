const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ot = require('../controllers/NH_otController');

const router = express.Router();

const adminRoles = ['hospital_admin', 'super_admin'];
const clinicalRoles = ['doctor', 'hospital_admin', 'super_admin', 'nurse', 'head_nurse'];
const allClinical = [...clinicalRoles, 'receptionist'];

// Stats & Schedule
router.get('/stats', authenticate, ot.getOTStats);
router.get('/schedule', authenticate, ot.getOTSchedule);

// OT Rooms
router.route('/rooms')
  .get(authenticate, ot.getOTRooms)
  .post(authenticate, authorize(...adminRoles), ot.createOTRoom);

router.route('/rooms/:id')
  .put(authenticate, authorize(...adminRoles), ot.updateOTRoom)
  .delete(authenticate, authorize(...adminRoles), ot.deleteOTRoom);

// Surgeries CRUD
router.route('/surgeries')
  .get(authenticate, ot.getSurgeries)
  .post(authenticate, authorize('doctor', ...adminRoles), ot.createSurgery);

router.route('/surgeries/:id')
  .get(authenticate, ot.getSurgeryById)
  .put(authenticate, authorize(...clinicalRoles), ot.updateSurgery)
  .delete(authenticate, authorize('doctor', ...adminRoles), ot.deleteSurgery);

// Workflow
router.post('/surgeries/:id/approve', authenticate, authorize(...adminRoles), ot.approveSurgery);
router.post('/surgeries/:id/schedule', authenticate, authorize(...allClinical), ot.scheduleSurgery);
router.post('/surgeries/:id/checklist', authenticate, authorize(...clinicalRoles), ot.updateChecklist);
router.post('/surgeries/:id/patient-in-ot', authenticate, authorize(...clinicalRoles), ot.patientInOT);
router.post('/surgeries/:id/start-anesthesia', authenticate, authorize('doctor', ...adminRoles), ot.startAnesthesia);
router.post('/surgeries/:id/start', authenticate, authorize('doctor', ...adminRoles), ot.startSurgery);
router.post('/surgeries/:id/end', authenticate, authorize('doctor', ...adminRoles), ot.endSurgery);
router.post('/surgeries/:id/recovery', authenticate, authorize(...clinicalRoles), ot.moveToRecovery);
router.post('/surgeries/:id/complete-recovery', authenticate, authorize(...clinicalRoles), ot.completeRecovery);
router.post('/surgeries/:id/complete', authenticate, authorize('doctor', ...adminRoles), ot.completeSurgery);

// Invoice
router.post('/generate-invoice', authenticate, authorize(...adminRoles, 'billing_staff', 'receptionist'), ot.generateOTInvoice);

module.exports = router;
