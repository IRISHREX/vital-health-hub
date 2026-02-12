const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_pharmacyController');

const router = express.Router();

const adminRoles = ['super_admin', 'hospital_admin'];
const pharmacyRoles = [...adminRoles, 'pharmacist', 'billing_staff'];
const clinicalRoles = [...pharmacyRoles, 'doctor', 'nurse', 'head_nurse'];

// Stats
router.get('/stats', authenticate, authorize(...clinicalRoles), c.getPharmacyStats);

// Medicines
router.route('/medicines')
  .get(authenticate, authorize(...clinicalRoles), c.getMedicines)
  .post(authenticate, authorize(...pharmacyRoles), c.createMedicine);

router.route('/medicines/:id')
  .get(authenticate, authorize(...clinicalRoles), c.getMedicine)
  .put(authenticate, authorize(...pharmacyRoles), c.updateMedicine)
  .delete(authenticate, authorize(...adminRoles), c.deleteMedicine);

// Stock
router.post('/stock/adjust', authenticate, authorize(...pharmacyRoles), c.adjustStock);
router.get('/stock/history', authenticate, authorize(...pharmacyRoles), c.getStockHistory);

// Prescriptions
router.route('/prescriptions')
  .get(authenticate, authorize(...clinicalRoles), c.getPrescriptions)
  .post(authenticate, authorize('doctor', ...adminRoles), c.createPrescription);

router.post('/prescriptions/:id/dispense', authenticate, authorize(...pharmacyRoles), c.dispensePrescription);
router.patch('/prescriptions/:id/cancel', authenticate, authorize('doctor', ...adminRoles), c.cancelPrescription);
router.get('/invoices', authenticate, authorize(...clinicalRoles), c.getPharmacyInvoices);

module.exports = router;
