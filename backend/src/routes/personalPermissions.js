const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/NH_personalPermissionController');

router.get('/my', authenticate, ctrl.getMyPersonalPermissions);
router.get('/check', authenticate, ctrl.checkPermission);
router.get('/:id', authenticate, authorize('super_admin', 'hospital_admin', 'doctor', 'head_nurse'), ctrl.getUserPersonalPermissions);
router.put('/my', authenticate, ctrl.updatePersonalPermissions);
router.put('/:id', authenticate, authorize('super_admin', 'hospital_admin'), ctrl.updatePersonalPermissions);

module.exports = router;
