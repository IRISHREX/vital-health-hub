const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getRoomTypeServices,
  getRoomTypeServiceByType,
  upsertRoomTypeService,
  updateServiceRule,
  removeServiceRule,
  checkServiceBillable
} = require('../controllers/NH_roomTypeServiceController');

const router = express.Router();

router.route('/')
  .get(authenticate, getRoomTypeServices)
  .post(authenticate, authorize('hospital_admin', 'super_admin'), upsertRoomTypeService);

router.route('/:roomType')
  .get(authenticate, getRoomTypeServiceByType);

router.route('/:roomType/rules')
  .patch(authenticate, authorize('hospital_admin', 'super_admin'), updateServiceRule);

router.route('/:roomType/rules/:ruleId')
  .delete(authenticate, authorize('hospital_admin', 'super_admin'), removeServiceRule);

router.route('/:roomType/check/:serviceId')
  .get(authenticate, checkServiceBillable);

module.exports = router;
