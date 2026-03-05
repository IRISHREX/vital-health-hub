const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createLedgerEntry,
  getLedgerEntries,
  generateProvisionalInvoice
} = require('../controllers/NH_billingLedgerController');

const router = express.Router();

router.route('/ledger')
  .get(authenticate, authorize('doctor', 'nurse', 'head_nurse', 'hospital_admin', 'super_admin', 'billing_staff'), getLedgerEntries)
  .post(authenticate, authorize('hospital_admin', 'super_admin', 'billing_staff'), createLedgerEntry);

router.post(
  '/ledger/generate-invoice',
  authenticate,
  authorize('hospital_admin', 'super_admin', 'billing_staff'),
  generateProvisionalInvoice
);

module.exports = router;
