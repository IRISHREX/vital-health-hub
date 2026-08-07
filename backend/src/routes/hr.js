const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_hrController');

const router = express.Router();

const ADMIN = ['super_admin', 'hospital_admin'];
const VIEW = ['super_admin', 'hospital_admin', 'billing_staff'];

router.get('/summary', authenticate, authorize(...VIEW), c.getHrSummary);

router.route('/employees')
  .get(authenticate, authorize(...VIEW), c.listEmployees)
  .post(authenticate, authorize(...ADMIN), c.createEmployee);

router.route('/employees/:id')
  .get(authenticate, authorize(...VIEW), c.getEmployee)
  .put(authenticate, authorize(...ADMIN), c.updateEmployee)
  .delete(authenticate, authorize(...ADMIN), c.deactivateEmployee);

router.post('/employees/:id/rotate-card', authenticate, authorize(...ADMIN), c.rotateEmployeeCard);
router.post('/employees/:id/card-issued', authenticate, authorize(...ADMIN), c.markCardIssued);

router.route('/leaves')
  .get(authenticate, authorize(...VIEW), c.listLeaveRequests)
  .post(authenticate, authorize(...ADMIN), c.createLeaveRequest);
router.post('/leaves/:id/decision', authenticate, authorize(...ADMIN), c.decideLeaveRequest);

router.route('/payroll')
  .get(authenticate, authorize(...VIEW), c.listPayrollRuns)
  .post(authenticate, authorize(...ADMIN), c.generatePayrollRun);
router.get('/payroll/:id', authenticate, authorize(...VIEW), c.getPayrollRun);
router.put('/payroll/:id/slips/:slipId', authenticate, authorize(...ADMIN), c.updatePayslip);
router.post('/payroll/:id/finalize', authenticate, authorize(...ADMIN), c.finalizePayrollRun);
router.post('/payroll/:id/slips/:slipId/pay', authenticate, authorize(...ADMIN), c.payPayslip);

module.exports = router;
