const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_hrmsPayrollController');

const router = express.Router();

const ADMIN = ['super_admin', 'hospital_admin'];
const VIEW = ['super_admin', 'hospital_admin', 'billing_staff'];

// Pay profiles
router.route('/pay-profiles')
  .get(authenticate, authorize(...VIEW), c.listPayProfiles);
router.route('/pay-profiles/:employeeId')
  .get(authenticate, authorize(...VIEW), c.getPayProfile)
  .put(authenticate, authorize(...ADMIN), c.upsertPayProfile)
  .delete(authenticate, authorize(...ADMIN), c.deletePayProfile);

// Policy
router.route('/policy')
  .get(authenticate, authorize(...VIEW), c.getPayrollPolicy)
  .put(authenticate, authorize(...ADMIN), c.updatePayrollPolicy);

// Runs
router.route('/runs')
  .get(authenticate, authorize(...VIEW), c.listRuns)
  .post(authenticate, authorize(...ADMIN), c.generateRun);
router.get('/runs/:id', authenticate, authorize(...VIEW), c.getRun);
router.post('/runs/:id/recalculate', authenticate, authorize(...ADMIN), c.recalculateRun);
router.put('/runs/:id/slips/:slipId', authenticate, authorize(...ADMIN), c.updateSlip);
router.post('/runs/:id/slips/:slipId/pay', authenticate, authorize(...ADMIN), c.markSlipPaid);
router.post('/runs/:id/status', authenticate, authorize(...ADMIN), c.transitionStatus);

// Per-employee payslip history
router.get('/employees/:employeeId/payslips', authenticate, authorize(...VIEW), c.getEmployeePayslips);

module.exports = router;
