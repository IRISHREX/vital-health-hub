const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_birthDeathController');

const router = express.Router();

const VIEW_ROLES = ['super_admin', 'hospital_admin', 'doctor', 'receptionist', 'head_nurse', 'nurse', 'billing_staff'];
const WRITE_ROLES = ['super_admin', 'hospital_admin', 'doctor', 'receptionist', 'head_nurse'];
const CERTIFY_ROLES = ['super_admin', 'hospital_admin', 'doctor'];

router.get('/stats', authenticate, authorize(...VIEW_ROLES), c.getVitalRecordStats);

router.route('/births')
  .get(authenticate, authorize(...VIEW_ROLES), c.listBirthRecords)
  .post(authenticate, authorize(...WRITE_ROLES), c.createBirthRecord);

router.route('/births/:id')
  .get(authenticate, authorize(...VIEW_ROLES), c.getBirthRecord)
  .put(authenticate, authorize(...WRITE_ROLES), c.updateBirthRecord)
  .delete(authenticate, authorize('super_admin', 'hospital_admin'), c.cancelBirthRecord);

router.post('/births/:id/certificate', authenticate, authorize(...CERTIFY_ROLES), c.issueBirthCertificate);

router.route('/deaths')
  .get(authenticate, authorize(...VIEW_ROLES), c.listDeathRecords)
  .post(authenticate, authorize(...WRITE_ROLES), c.createDeathRecord);

router.route('/deaths/:id')
  .get(authenticate, authorize(...VIEW_ROLES), c.getDeathRecord)
  .put(authenticate, authorize(...WRITE_ROLES), c.updateDeathRecord)
  .delete(authenticate, authorize('super_admin', 'hospital_admin'), c.cancelDeathRecord);

router.post('/deaths/:id/certificate', authenticate, authorize(...CERTIFY_ROLES), c.issueDeathCertificate);

module.exports = router;
