const PlatformConfig = require('../models/GM_PlatformConfig');
const { AppError } = require('../middleware/errorHandler');

exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const configs = await PlatformConfig.find(filter).sort({ category: 1, key: 1 });
    res.json({ success: true, data: configs });
  } catch (error) { next(error); }
};

exports.get = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne({ key: req.params.key });
    if (!config) throw new AppError('Config not found', 404);
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
};

exports.upsert = async (req, res, next) => {
  try {
    const { key, value, category, description } = req.body;
    const config = await PlatformConfig.findOneAndUpdate(
      { key },
      { value, category, description, updatedBy: req.user?.email || 'system' },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await PlatformConfig.findOneAndDelete({ key: req.params.key });
    res.json({ success: true, message: 'Config removed' });
  } catch (error) { next(error); }
};
