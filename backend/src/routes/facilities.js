const express = require('express');
const router = express.Router();
const {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
  addFacilityService,
  updateFacilityService,
  deleteFacilityService
} = require('../controllers/NH_facilityController');
const { authenticate, authorize } = require('../middleware/auth');

router.route('/')
  .get(authenticate, getFacilities)
  .post(authenticate, authorize('hospital_admin', 'super_admin'), createFacility);

router.route('/:id')
  .get(authenticate, getFacilityById)
  .put(authenticate, authorize('hospital_admin', 'super_admin'), updateFacility)
  .delete(authenticate, authorize('hospital_admin', 'super_admin'), deleteFacility);

router.route('/:id/services')
    .post(authenticate, authorize('hospital_admin', 'super_admin'), addFacilityService);

router.route('/:id/services/:serviceId')
    .put(authenticate, authorize('hospital_admin', 'super_admin'), updateFacilityService)
    .delete(authenticate, authorize('hospital_admin', 'super_admin'), deleteFacilityService);

module.exports = router;
