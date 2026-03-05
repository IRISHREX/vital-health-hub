const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment
} = require('../controllers/NH_invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.route('/')
  .get(authenticate, getInvoices)
  .post(authenticate, authorize('hospital_admin', 'super_admin', 'receptionist', 'billing_staff'), createInvoice);

router.route('/:id')
  .get(authenticate, getInvoiceById)
  .put(authenticate, authorize('hospital_admin', 'super_admin', 'billing_staff'), updateInvoice)
  .delete(authenticate, authorize('hospital_admin', 'super_admin'), deleteInvoice);

router.route('/:id/payments')
    .post(authenticate, authorize('hospital_admin', 'super_admin', 'receptionist', 'billing_staff'), addPayment);

module.exports = router;
