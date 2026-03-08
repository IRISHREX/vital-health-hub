const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../controllers/NH_serviceCatalogController');

const router = express.Router();

router.route('/')
  .get(authenticate, getServices)
  .post(authenticate, authorize('hospital_admin', 'super_admin'), createService);

router.route('/:id')
  .get(authenticate, getServiceById)
  .put(authenticate, authorize('hospital_admin', 'super_admin'), updateService)
  .delete(authenticate, authorize('hospital_admin', 'super_admin'), deleteService);

module.exports = router;
