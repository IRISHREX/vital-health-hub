const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const dashboardController = require('../controllers/NH_dashboardController');

router.get(
  '/',
  authenticate,
  authorize('super_admin', 'hospital_admin', 'doctor', 'nurse', 'head_nurse', 'receptionist', 'billing_staff'),
  dashboardController.getDashboard
);

module.exports = router;
