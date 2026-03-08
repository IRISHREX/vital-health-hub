const BaseServiceCatalog = require('../models/NH_ServiceCatalog');
const { AppError } = require('../middleware/errorHandler');
const { getModel } = require('../utils/tenantModel');

const getServiceCatalogModel = (req) => getModel(req, 'ServiceCatalog', BaseServiceCatalog);

// @desc    Get all catalog services
// @route   GET /api/service-catalog
exports.getServices = async (req, res, next) => {
  try {
    const ServiceCatalog = getServiceCatalogModel(req);
    const { category, billable, active, search, page = 1, limit = 100 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (billable !== undefined) query.defaultBillable = billable === 'true';
    if (active !== undefined) query.isActive = active === 'true';
    if (search) query.$text = { $search: search };

    const total = await ServiceCatalog.countDocuments(query);
    const services = await ServiceCatalog.find(query)
      .sort({ category: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: { services, pagination: { total, page: parseInt(page, 10), pages: Math.ceil(total / limit) } }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single service
// @route   GET /api/service-catalog/:id
exports.getServiceById = async (req, res, next) => {
  try {
    const ServiceCatalog = getServiceCatalogModel(req);
    const service = await ServiceCatalog.findById(req.params.id);
    if (!service) throw new AppError('Service not found', 404);
    res.json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
};

// @desc    Create catalog service
// @route   POST /api/service-catalog
exports.createService = async (req, res, next) => {
  try {
    const ServiceCatalog = getServiceCatalogModel(req);
    const service = await ServiceCatalog.create(req.body);
    res.status(201).json({ success: true, message: 'Service created', data: service });
  } catch (error) {
    next(error);
  }
};

// @desc    Update catalog service
// @route   PUT /api/service-catalog/:id
exports.updateService = async (req, res, next) => {
  try {
    const ServiceCatalog = getServiceCatalogModel(req);
    const service = await ServiceCatalog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!service) throw new AppError('Service not found', 404);
    res.json({ success: true, message: 'Service updated', data: service });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete catalog service
// @route   DELETE /api/service-catalog/:id
exports.deleteService = async (req, res, next) => {
  try {
    const ServiceCatalog = getServiceCatalogModel(req);
    const service = await ServiceCatalog.findByIdAndDelete(req.params.id);
    if (!service) throw new AppError('Service not found', 404);
    res.json({ success: true, message: 'Service deleted' });
  } catch (error) {
    next(error);
  }
};
