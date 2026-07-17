const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_returnController');

const staff = ['super_admin', 'hospital_admin', 'billing_staff', 'pharmacist', 'doctor', 'head_nurse', 'nurse', 'receptionist'];
const approver = ['super_admin', 'hospital_admin', 'billing_staff', 'pharmacist'];

router.get('/', authenticate, authorize(...staff), c.listReturns);
router.post('/', authenticate, authorize(...staff), c.createReturn);
router.post('/:id/process', authenticate, authorize(...approver), c.processReturn);

module.exports = router;
