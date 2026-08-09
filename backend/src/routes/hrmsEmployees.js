const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_hrmsEmployeeController');

const router = express.Router();

const ADMIN = ['super_admin', 'hospital_admin'];
const VIEW = ['super_admin', 'hospital_admin', 'billing_staff'];

router.route('/')
  .get(authenticate, authorize(...VIEW), c.listEmployees)
  .post(authenticate, authorize(...ADMIN), c.createEmployee);

router.get('/compliance', authenticate, authorize(...VIEW), c.complianceDashboard);
router.post('/compliance/run-alerts', authenticate, authorize(...ADMIN), c.runComplianceAlertsEndpoint);

router.route('/:id')
  .get(authenticate, authorize(...VIEW), c.getEmployee)
  .put(authenticate, authorize(...ADMIN), c.updateEmployee)
  .delete(authenticate, authorize(...ADMIN), c.deactivateEmployee);

const subRoutes = [
  ['licenses', c.licenses],
  ['certifications', c.certifications],
  ['immunizations', c.immunizations],
  ['health-checks', c.healthChecks],
  ['hazard-exposures', c.hazardExposures],
  ['privileges', c.privileges],
];

subRoutes.forEach(([path, handlers]) => {
  router.post(`/:id/${path}`, authenticate, authorize(...ADMIN), handlers.add);
  router.put(`/:id/${path}/:itemId`, authenticate, authorize(...ADMIN), handlers.update);
  router.delete(`/:id/${path}/:itemId`, authenticate, authorize(...ADMIN), handlers.remove);
});

module.exports = router;
