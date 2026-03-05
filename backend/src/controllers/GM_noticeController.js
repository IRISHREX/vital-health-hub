const PlatformNotice = require('../models/GM_PlatformNotice');
const { AppError } = require('../middleware/errorHandler');

exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.published !== undefined) filter.isPublished = req.query.published === 'true';
    const notices = await PlatformNotice.find(filter)
      .populate('targetOrganizations', 'name slug')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: notices });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const notice = await PlatformNotice.create({
      ...req.body,
      createdBy: req.user?.email || 'system'
    });
    res.status(201).json({ success: true, data: notice });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const notice = await PlatformNotice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!notice) throw new AppError('Notice not found', 404);
    res.json({ success: true, data: notice });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await PlatformNotice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notice deleted' });
  } catch (error) { next(error); }
};
