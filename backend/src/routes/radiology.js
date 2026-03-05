const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getRadiologyOrders, getRadiologyOrderById,
  createRadiologyOrder, updateRadiologyOrder, deleteRadiologyOrder,
  scheduleOrder, startStudy, completeStudy,
  createReport, verifyReport, deliverReport,
  getRadiologyStats, generateRadiologyInvoice
} = require('../controllers/NH_radiologyController');

const router = express.Router();

// Stats
router.get('/stats', authenticate, getRadiologyStats);

// CRUD
router.route('/')
  .get(authenticate, getRadiologyOrders)
  .post(authenticate, authorize('doctor', 'hospital_admin', 'super_admin', 'nurse', 'head_nurse', 'receptionist'), createRadiologyOrder);

router.route('/:id')
  .get(authenticate, getRadiologyOrderById)
  .put(authenticate, authorize('doctor', 'hospital_admin', 'super_admin', 'nurse', 'head_nurse'), updateRadiologyOrder)
  .delete(authenticate, authorize('doctor', 'hospital_admin', 'super_admin'), deleteRadiologyOrder);

// Workflow
router.post('/:id/schedule', authenticate, authorize('hospital_admin', 'super_admin', 'nurse', 'head_nurse', 'receptionist'), scheduleOrder);
router.post('/:id/start', authenticate, authorize('hospital_admin', 'super_admin', 'doctor', 'nurse', 'head_nurse'), startStudy);
router.post('/:id/complete', authenticate, authorize('hospital_admin', 'super_admin', 'doctor', 'nurse', 'head_nurse'), completeStudy);

// Report
router.post('/:id/report', authenticate, authorize('doctor', 'hospital_admin', 'super_admin'), createReport);
router.post('/:id/verify', authenticate, authorize('doctor', 'hospital_admin', 'super_admin'), verifyReport);
router.post('/:id/deliver', authenticate, authorize('hospital_admin', 'super_admin', 'receptionist', 'nurse', 'head_nurse'), deliverReport);

// Invoice
router.post('/generate-invoice', authenticate, authorize('hospital_admin', 'super_admin', 'billing_staff', 'receptionist'), generateRadiologyInvoice);

module.exports = router;
