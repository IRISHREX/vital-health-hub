const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_estimateController');

const router = express.Router();

const VIEW_ROLES = ['super_admin', 'hospital_admin', 'billing_staff', 'receptionist', 'doctor'];
const MANAGE_ROLES = ['super_admin', 'hospital_admin', 'billing_staff', 'receptionist'];

router.get('/catalog-search', authenticate, authorize(...VIEW_ROLES), c.searchCatalog);

router.route('/')
  .get(authenticate, authorize(...VIEW_ROLES), c.listEstimates)
  .post(authenticate, authorize(...MANAGE_ROLES), c.createEstimate);

router.route('/:id')
  .get(authenticate, authorize(...VIEW_ROLES), c.getEstimate)
  .put(authenticate, authorize(...MANAGE_ROLES), c.updateEstimate)
  .delete(authenticate, authorize('super_admin', 'hospital_admin', 'billing_staff'), c.deleteEstimate);

module.exports = router;
