const jwt = require('jsonwebtoken');
const GrandmasterUser = require('../models/GM_GrandmasterUser');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, isGrandmaster: true },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await GrandmasterUser.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.isActive) throw new AppError('Account deactivated', 401);
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar
        },
        token: generateToken(user)
      }
    });
  } catch (error) { next(error); }
};

// Get current user
exports.getMe = async (req, res, next) => {
  try {
    const user = await GrandmasterUser.findById(req.user._id);
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
};

// List platform admins
exports.listAdmins = async (req, res, next) => {
  try {
    const admins = await GrandmasterUser.find().sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (error) { next(error); }
};

// Create platform admin
exports.createAdmin = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;
    const existing = await GrandmasterUser.findOne({ email: email.toLowerCase() });
    if (existing) throw new AppError('Email already in use', 400);

    const admin = await GrandmasterUser.create({ email, password, firstName, lastName, role: role || 'platform_admin', phone });
    res.status(201).json({ success: true, data: admin });
  } catch (error) { next(error); }
};

// Update admin
exports.updateAdmin = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, isActive, role } = req.body;
    const admin = await GrandmasterUser.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, phone, isActive, role },
      { new: true, runValidators: true }
    );
    if (!admin) throw new AppError('Admin not found', 404);
    res.json({ success: true, data: admin });
  } catch (error) { next(error); }
};

// Delete admin
exports.deleteAdmin = async (req, res, next) => {
  try {
    const admin = await GrandmasterUser.findById(req.params.id);
    if (!admin) throw new AppError('Admin not found', 404);
    if (admin.role === 'grandmaster') throw new AppError('Cannot delete grandmaster account', 403);
    await admin.deleteOne();
    res.json({ success: true, message: 'Admin deleted' });
  } catch (error) { next(error); }
};
