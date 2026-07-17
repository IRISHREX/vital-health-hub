const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_pacController');

const view = ['super_admin', 'hospital_admin', 'doctor', 'head_nurse', 'nurse'];
const write = ['super_admin', 'hospital_admin', 'doctor'];

router.get('/', authenticate, authorize(...view), c.listPAC);
router.post('/', authenticate, authorize(...write), c.createPAC);
router.put('/:id', authenticate, authorize(...write), c.updatePAC);
router.post('/:id/clearance', authenticate, authorize(...write), c.clearancePAC);

module.exports = router;
