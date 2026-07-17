const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_fluidIOController');

const roles = ['super_admin', 'hospital_admin', 'head_nurse', 'nurse', 'doctor'];

router.get('/', authenticate, authorize(...roles), c.listIO);
router.get('/summary', authenticate, authorize(...roles), c.summaryIO);
router.post('/', authenticate, authorize(...roles), c.createIO);
router.delete('/:id', authenticate, authorize('super_admin', 'hospital_admin', 'head_nurse'), c.deleteIO);

module.exports = router;
