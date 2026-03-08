const BaseRoomTypeService = require('../models/NH_RoomTypeService');
const { AppError } = require('../middleware/errorHandler');
const { getModel } = require('../utils/tenantModel');

const getRoomTypeServiceModel = (req) => getModel(req, 'RoomTypeService', BaseRoomTypeService);

// @desc    Get all room type service rules
// @route   GET /api/room-type-services
exports.getRoomTypeServices = async (req, res, next) => {
  try {
    const RoomTypeService = getRoomTypeServiceModel(req);
    const rules = await RoomTypeService.find()
      .populate('serviceRules.service', 'serviceId name category defaultBillable defaultPrice unit')
      .sort({ roomType: 1 });
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single room type service config
// @route   GET /api/room-type-services/:roomType
exports.getRoomTypeServiceByType = async (req, res, next) => {
  try {
    const RoomTypeService = getRoomTypeServiceModel(req);
    const rule = await RoomTypeService.findOne({ roomType: req.params.roomType })
      .populate('serviceRules.service', 'serviceId name category defaultBillable defaultPrice unit');
    if (!rule) throw new AppError('Room type service config not found', 404);
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update room type service config
// @route   POST /api/room-type-services
exports.upsertRoomTypeService = async (req, res, next) => {
  try {
    const RoomTypeService = getRoomTypeServiceModel(req);
    const { roomType, displayName, description, baseRate, serviceRules, isActive } = req.body;

    if (!roomType) throw new AppError('roomType is required', 400);

    const rule = await RoomTypeService.findOneAndUpdate(
      { roomType },
      { roomType, displayName, description, baseRate, serviceRules, isActive },
      { new: true, upsert: true, runValidators: true }
    ).populate('serviceRules.service', 'serviceId name category defaultBillable defaultPrice unit');

    res.json({ success: true, message: 'Room type service config saved', data: rule });
  } catch (error) {
    next(error);
  }
};

// @desc    Add/update a service rule on a room type
// @route   PATCH /api/room-type-services/:roomType/rules
exports.updateServiceRule = async (req, res, next) => {
  try {
    const RoomTypeService = getRoomTypeServiceModel(req);
    const { serviceId, billable, overridePrice, notes } = req.body;

    if (!serviceId) throw new AppError('serviceId is required', 400);
    if (billable === undefined) throw new AppError('billable is required', 400);

    const rule = await RoomTypeService.findOne({ roomType: req.params.roomType });
    if (!rule) throw new AppError('Room type config not found', 404);

    const existingIdx = rule.serviceRules.findIndex(
      (r) => r.service.toString() === serviceId
    );

    if (existingIdx >= 0) {
      rule.serviceRules[existingIdx].billable = billable;
      rule.serviceRules[existingIdx].overridePrice = overridePrice ?? null;
      rule.serviceRules[existingIdx].notes = notes || '';
    } else {
      rule.serviceRules.push({
        service: serviceId,
        billable,
        overridePrice: overridePrice ?? null,
        notes: notes || ''
      });
    }

    await rule.save();
    const populated = await RoomTypeService.findById(rule._id)
      .populate('serviceRules.service', 'serviceId name category defaultBillable defaultPrice unit');

    res.json({ success: true, message: 'Service rule updated', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a service rule from room type
// @route   DELETE /api/room-type-services/:roomType/rules/:ruleId
exports.removeServiceRule = async (req, res, next) => {
  try {
    const RoomTypeService = getRoomTypeServiceModel(req);
    const rule = await RoomTypeService.findOne({ roomType: req.params.roomType });
    if (!rule) throw new AppError('Room type config not found', 404);

    rule.serviceRules = rule.serviceRules.filter(
      (r) => r._id.toString() !== req.params.ruleId
    );
    await rule.save();

    res.json({ success: true, message: 'Service rule removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if a service is billable for a given room type
// @route   GET /api/room-type-services/:roomType/check/:serviceId
exports.checkServiceBillable = async (req, res, next) => {
  try {
    const RoomTypeService = getRoomTypeServiceModel(req);
    const BaseServiceCatalog = require('../models/NH_ServiceCatalog');
    const ServiceCatalog = getModel(req, 'ServiceCatalog', BaseServiceCatalog);

    const rule = await RoomTypeService.findOne({ roomType: req.params.roomType });
    const service = await ServiceCatalog.findById(req.params.serviceId);

    if (!service) throw new AppError('Service not found', 404);

    let billable = service.defaultBillable;
    let price = service.defaultPrice;

    if (rule) {
      const serviceRule = rule.serviceRules.find(
        (r) => r.service.toString() === req.params.serviceId
      );
      if (serviceRule) {
        billable = serviceRule.billable;
        if (serviceRule.overridePrice !== null && serviceRule.overridePrice !== undefined) {
          price = serviceRule.overridePrice;
        }
      }
    }

    res.json({
      success: true,
      data: {
        service: { _id: service._id, name: service.name, serviceId: service.serviceId },
        roomType: req.params.roomType,
        billable,
        price
      }
    });
  } catch (error) {
    next(error);
  }
};
