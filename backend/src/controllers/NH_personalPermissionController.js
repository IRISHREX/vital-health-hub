const { User } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// Personal permission schema stored on User model as personalPermissions field
// Doctor: { prescriptions: { view, edit, create, delete }, schedule: { view, edit } }
// Head Nurse: { tasks: { create, edit, delete }, vitals: { create, edit }, transfer: { allow }, assign: { allow }, reject: { allow } }

// Get my personal permissions
exports.getMyPersonalPermissions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('personalPermissions role');
    res.json({ success: true, data: user?.personalPermissions || {} });
  } catch (error) { next(error); }
};

// Get personal permissions for a specific user (admin/super_admin)
exports.getUserPersonalPermissions = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('personalPermissions role firstName lastName');
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { permissions: user.personalPermissions || {}, role: user.role, name: `${user.firstName} ${user.lastName}` } });
  } catch (error) { next(error); }
};

// Update personal permissions (self or admin)
exports.updatePersonalPermissions = async (req, res, next) => {
  try {
    const targetId = req.params.id || req.user._id;
    const isSelf = targetId.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'hospital_admin'].includes(req.user.role);

    if (!isSelf && !isAdmin) throw new AppError('Unauthorized', 403);

    const user = await User.findById(targetId);
    if (!user) throw new AppError('User not found', 404);

    // Validate role-appropriate permissions
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') throw new AppError('Invalid permissions object', 400);

    user.personalPermissions = { ...(user.personalPermissions || {}), ...permissions };
    await user.save();

    res.json({ success: true, message: 'Personal permissions updated', data: user.personalPermissions });
  } catch (error) { next(error); }
};

// Check if a user grants permission to another user for a specific action
exports.checkPermission = async (req, res, next) => {
  try {
    const { ownerId, module, action } = req.query;
    if (!ownerId || !module || !action) throw new AppError('ownerId, module, and action are required', 400);

    const owner = await User.findById(ownerId).select('personalPermissions role');
    if (!owner) throw new AppError('User not found', 404);

    const perms = owner.personalPermissions || {};
    const modulePerms = perms[module] || {};
    const allowed = modulePerms[action] === true || modulePerms[action] === 'all';

    res.json({ success: true, data: { allowed } });
  } catch (error) { next(error); }
};
