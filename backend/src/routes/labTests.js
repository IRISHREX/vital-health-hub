const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getCatalog, getCatalogItem, createCatalogItem, updateCatalogItem, deleteCatalogItem,
  getLabTests, getLabTestById, createLabTest, updateLabTest, deleteLabTest,
  collectSample, receiveSample, rejectSample, startProcessing,
  enterResults, verifyResults, deliverReport,
  getLabStats, generateLabInvoice
} = require('../controllers/NH_labTestController');

const router = express.Router();

// Stats
router.get('/stats', authenticate, getLabStats);

// Catalog
router.route('/catalog')
  .get(authenticate, getCatalog)
  .post(authenticate, authorize('hospital_admin', 'super_admin'), createCatalogItem);

router.route('/catalog/:id')
  .get(authenticate, getCatalogItem)
  .put(authenticate, authorize('hospital_admin', 'super_admin'), updateCatalogItem)
  .delete(authenticate, authorize('hospital_admin', 'super_admin'), deleteCatalogItem);

// Lab test orders
router.route('/')
  .get(authenticate, getLabTests)
  .post(authenticate, authorize('doctor', 'hospital_admin', 'super_admin', 'nurse', 'head_nurse', 'receptionist'), createLabTest);

router.route('/:id')
  .get(authenticate, getLabTestById)
  .put(authenticate, authorize('doctor', 'hospital_admin', 'super_admin', 'nurse', 'head_nurse'), updateLabTest)
  .delete(authenticate, authorize('doctor', 'hospital_admin', 'super_admin'), deleteLabTest);

// Sample workflow
router.post('/:id/collect-sample', authenticate, authorize('nurse', 'head_nurse', 'hospital_admin', 'super_admin', 'receptionist'), collectSample);
router.post('/:id/receive-sample', authenticate, authorize('hospital_admin', 'super_admin', 'nurse', 'head_nurse'), receiveSample);
router.post('/:id/reject-sample', authenticate, authorize('hospital_admin', 'super_admin', 'doctor'), rejectSample);
router.post('/:id/start-processing', authenticate, authorize('hospital_admin', 'super_admin', 'nurse', 'head_nurse'), startProcessing);

// Results
router.post('/:id/enter-results', authenticate, authorize('doctor', 'hospital_admin', 'super_admin', 'nurse', 'head_nurse'), enterResults);
router.post('/:id/verify', authenticate, authorize('doctor', 'hospital_admin', 'super_admin'), verifyResults);
router.post('/:id/deliver', authenticate, authorize('hospital_admin', 'super_admin', 'receptionist', 'nurse', 'head_nurse'), deliverReport);

// Invoice generation
router.post('/generate-invoice', authenticate, authorize('hospital_admin', 'super_admin', 'billing_staff', 'receptionist'), generateLabInvoice);

module.exports = router;
