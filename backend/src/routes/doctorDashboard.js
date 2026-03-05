const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/NH_doctorDashboardController');

router.get('/:id/profile', authenticate, ctrl.getDoctorProfile);
router.get('/:id/revenue', authenticate, ctrl.getDoctorRevenue);

module.exports = router;
