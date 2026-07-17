const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_nursingChargeController');

const roles = ['super_admin', 'hospital_admin', 'head_nurse', 'nurse', 'doctor', 'billing_staff'];

router.get('/', authenticate, authorize(...roles), c.listNursingCharges);
router.post('/', authenticate, authorize(...roles), c.createNursingCharge);
router.post('/:id/cancel', authenticate, authorize('super_admin', 'hospital_admin', 'head_nurse', 'billing_staff'), c.cancelNursingCharge);

module.exports = router;
