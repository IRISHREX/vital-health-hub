const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_attendanceController');

const router = express.Router();

const ADMIN_ROLES = ['super_admin', 'hospital_admin'];

// Any authenticated employee can scan a posted location QR to punch in/out.
router.post('/scan', authenticate, c.scanAttendance);
router.get('/me', authenticate, c.getMyAttendance);
// Kiosk: an operator scans an employee ID card QR at a posted location.
router.post('/card-scan', authenticate, c.scanEmployeeCard);
router.post('/punch', authenticate, c.submitPunch);

router.route('/locations')
  .get(authenticate, c.listLocations)
  .post(authenticate, authorize(...ADMIN_ROLES), c.createLocation);

router.route('/locations/:id')
  .put(authenticate, authorize(...ADMIN_ROLES), c.updateLocation)
  .delete(authenticate, authorize(...ADMIN_ROLES), c.deleteLocation);

router.post('/locations/:id/rotate', authenticate, authorize(...ADMIN_ROLES), c.rotateLocationToken);

router.route('/')
  .get(authenticate, c.listAttendance)
  .post(authenticate, authorize(...ADMIN_ROLES), c.upsertManualAttendance);

module.exports = router;
