const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_hrmsClaimController');

const router = express.Router();

const ADMIN = ['super_admin', 'hospital_admin'];
const WARD_INCHARGE = ['head_nurse', 'hospital_admin', 'super_admin'];
const DEPT_HEAD = ['hospital_admin', 'super_admin'];
const FINANCE = ['billing_staff', 'hospital_admin', 'super_admin'];
const ANY_STAFF = ['super_admin', 'hospital_admin', 'billing_staff', 'head_nurse', 'nurse', 'doctor', 'receptionist', 'pharmacist'];

router.get('/meta', authenticate, c.getMeta);
router.get('/summary', authenticate, authorize(...ADMIN), c.getSummary);

router.post('/extract-receipt', authenticate, c.extractReceipt);

router.route('/policies')
  .get(authenticate, c.listPolicies)
  .post(authenticate, authorize(...ADMIN), c.upsertPolicy);
router.delete('/policies/:id', authenticate, authorize(...ADMIN), c.deletePolicy);

router.get('/', authenticate, c.listClaims);
router.post('/', authenticate, c.saveDraft);
router.get('/:id', authenticate, c.getClaim);
router.put('/:id', authenticate, c.saveDraft);
router.post('/:id/submit', authenticate, c.submitClaim);
router.post('/:id/act', authenticate, authorize(...[...new Set([...WARD_INCHARGE, ...DEPT_HEAD, ...FINANCE])]), c.actOnClaim);
router.post('/:id/cancel', authenticate, c.cancelClaim);
router.post('/:id/mark-paid', authenticate, authorize(...FINANCE), c.markPaid);

module.exports = router;
