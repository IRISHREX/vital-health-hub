const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_handoverController');

const roles = ['super_admin', 'hospital_admin', 'head_nurse', 'nurse', 'doctor'];

router.get('/', authenticate, authorize(...roles), c.listHandovers);
router.post('/', authenticate, authorize(...roles), c.createHandover);
router.post('/:id/respond', authenticate, authorize(...roles), c.respondHandover);

module.exports = router;
