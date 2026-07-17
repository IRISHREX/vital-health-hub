const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_medicineIndentController');

const view = ['super_admin', 'hospital_admin', 'pharmacist', 'nurse', 'head_nurse', 'doctor'];
const request = ['super_admin', 'hospital_admin', 'nurse', 'head_nurse', 'doctor'];
const issue = ['super_admin', 'hospital_admin', 'pharmacist'];

router.get('/', authenticate, authorize(...view), c.listIndents);
router.post('/', authenticate, authorize(...request), c.createIndent);
router.post('/:id/issue', authenticate, authorize(...issue), c.issueIndent);
router.post('/:id/return', authenticate, authorize(...view), c.returnIndent);
router.post('/:id/cancel', authenticate, authorize(...view), c.cancelIndent);

module.exports = router;
