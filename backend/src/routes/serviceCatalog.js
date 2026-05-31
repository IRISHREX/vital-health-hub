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
const serviceCatalogViewRoles = ['super_admin', 'hospital_admin', 'doctor', 'receptionist', 'billing_staff', 'nurse', 'head_nurse', 'pharmacist'];

router.route('/')
  .get(authenticate, authorize(...serviceCatalogViewRoles), getServices)
  .post(authenticate, authorize('hospital_admin', 'super_admin'), createService);

router.route('/:id')
  .get(authenticate, authorize(...serviceCatalogViewRoles), getServiceById)
  .put(authenticate, authorize('hospital_admin', 'super_admin'), updateService)
  .delete(authenticate, authorize('hospital_admin', 'super_admin'), deleteService);

module.exports = router;
