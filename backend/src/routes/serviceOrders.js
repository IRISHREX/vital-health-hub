const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createServiceOrder,
  getServiceOrders,
  updateServiceOrder
} = require('../controllers/NH_serviceOrderController');

const router = express.Router();

router.route('/')
  .get(authenticate, authorize('doctor', 'nurse', 'head_nurse', 'hospital_admin', 'super_admin', 'billing_staff'), getServiceOrders)
  .post(authenticate, authorize('doctor', 'nurse', 'head_nurse', 'hospital_admin', 'super_admin'), createServiceOrder);

router.route('/:id')
  .patch(authenticate, authorize('doctor', 'nurse', 'head_nurse', 'hospital_admin', 'super_admin'), updateServiceOrder);

module.exports = router;
