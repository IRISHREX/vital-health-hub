const Facility = require('../models/NH_Facility');
const asyncHandler = require('express-async-handler');

// @desc    Get all facilities
// @route   GET /api/facilities
// @access  Private
exports.getFacilities = asyncHandler(async (req, res) => {
  const facilities = await Facility.find().populate('inCharge', 'name email');
  res.json(facilities);
});

// @desc    Get single facility
// @route   GET /api/facilities/:id
// @access  Private
exports.getFacilityById = asyncHandler(async (req, res) => {
  const facility = await Facility.findById(req.params.id).populate('inCharge', 'name email').populate('staff.user', 'name email');
  if (facility) {
    res.json(facility);
  } else {
    res.status(404);
    throw new Error('Facility not found');
  }
});

// @desc    Create a facility
// @route   POST /api/facilities
// @access  Private/Admin
exports.createFacility = asyncHandler(async (req, res) => {
  const {
    name,
    type,
    description,
    location,
    capacity,
    status,
    operatingHours,
    services,
    contactNumber,
    email,
    inCharge
  } = req.body;

  const facility = new Facility({
    name,
    type,
    description,
    location,
    capacity,
    status,
    operatingHours,
    services,
    contactNumber,
    email,
    inCharge
  });

  const createdFacility = await facility.save();
  res.status(201).json(createdFacility);
});

// @desc    Update a facility
// @route   PUT /api/facilities/:id
// @access  Private/Admin
exports.updateFacility = asyncHandler(async (req, res) => {
  const {
    name,
    type,
    description,
    location,
    capacity,
    status,
    operatingHours,
    equipment,
    staff,
    services,
    contactNumber,
    email,
    inCharge,
    isActive
  } = req.body;

  const facility = await Facility.findById(req.params.id);

  if (facility) {
    facility.name = name || facility.name;
    facility.type = type || facility.type;
    facility.description = description || facility.description;
    facility.location = location || facility.location;
    facility.capacity = capacity || facility.capacity;
    facility.status = status || facility.status;
    facility.operatingHours = operatingHours || facility.operatingHours;
    facility.equipment = equipment || facility.equipment;
    facility.staff = staff || facility.staff;
    facility.services = services || facility.services;
    facility.contactNumber = contactNumber || facility.contactNumber;
    facility.email = email || facility.email;
    facility.inCharge = inCharge || facility.inCharge;
    facility.isActive = isActive === undefined ? facility.isActive : isActive;

    const updatedFacility = await facility.save();
    res.json(updatedFacility);
  } else {
    res.status(404);
    throw new Error('Facility not found');
  }
});

// @desc    Delete a facility
// @route   DELETE /api/facilities/:id
// @access  Private/Admin
exports.deleteFacility = asyncHandler(async (req, res) => {
  const facility = await Facility.findById(req.params.id);

  if (facility) {
    await facility.remove();
    res.json({ message: 'Facility removed' });
  } else {
    res.status(404);
    throw new Error('Facility not found');
  }
});

// @desc    Add a service to a facility
// @route   POST /api/facilities/:id/services
// @access  Private/Admin
exports.addFacilityService = asyncHandler(async (req, res) => {
    const { name, price, duration, description } = req.body;
    const facility = await Facility.findById(req.params.id);

    if (facility) {
        const newService = {
            name,
            price,
            duration,
            description
        };
        facility.services.push(newService);
        await facility.save();
        res.status(201).json(facility.services);
    } else {
        res.status(404);
        throw new Error('Facility not found');
    }
});

// @desc    Update a facility service
// @route   PUT /api/facilities/:id/services/:serviceId
// @access  Private/Admin
exports.updateFacilityService = asyncHandler(async (req, res) => {
    const { name, price, duration, description } = req.body;
    const facility = await Facility.findById(req.params.id);

    if (facility) {
        const service = facility.services.id(req.params.serviceId);
        if (service) {
            service.name = name || service.name;
            service.price = price || service.price;
            service.duration = duration || service.duration;
            service.description = description || service.description;
            await facility.save();
            res.json(facility.services);
        } else {
            res.status(404);
            throw new Error('Service not found');
        }
    } else {
        res.status(404);
        throw new Error('Facility not found');
    }
});

// @desc    Delete a facility service
// @route   DELETE /api/facilities/:id/services/:serviceId
// @access  Private/Admin
exports.deleteFacilityService = asyncHandler(async (req, res) => {
    const facility = await Facility.findById(req.params.id);
    if (facility) {
        const service = facility.services.id(req.params.serviceId);
        if(service){
            service.remove();
            await facility.save();
            res.json({ message: 'Service removed' });
        } else {
            res.status(404);
            throw new Error('Service not found');
        }
    } else {
        res.status(404);
        throw new Error('Facility not found');
    }
});
