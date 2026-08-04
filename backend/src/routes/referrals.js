const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_referralController');

const router = express.Router();

const VIEW_ROLES = ['super_admin', 'hospital_admin', 'billing_staff', 'receptionist'];
const MANAGE_ROLES = ['super_admin', 'hospital_admin', 'billing_staff'];
const PAYOUT_ROLES = ['super_admin', 'hospital_admin'];

router.route('/')
  .get(authenticate, authorize(...VIEW_ROLES), c.listReferrers)
  .post(authenticate, authorize(...MANAGE_ROLES), c.createReferrer);

router.get('/commissions', authenticate, authorize(...VIEW_ROLES), c.listCommissions);
router.put('/commissions/:id/status', authenticate, authorize(...PAYOUT_ROLES), c.updateCommissionStatus);
router.post('/attach-invoice', authenticate, authorize(...MANAGE_ROLES), c.attachReferrerToInvoice);

router.get('/:id/summary', authenticate, authorize(...VIEW_ROLES), c.getReferrerSummary);

router.route('/:id')
  .put(authenticate, authorize(...MANAGE_ROLES), c.updateReferrer)
  .delete(authenticate, authorize(...PAYOUT_ROLES), c.deleteReferrer);

module.exports = router;
