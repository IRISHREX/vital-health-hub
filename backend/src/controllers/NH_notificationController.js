const Notification = require('../models/NH_Notification');
const { AppError } = require('../middleware/errorHandler');
const { emitNotification } = require('../config/socket');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead, type, priority } = req.query;
    
    const query = { recipient: req.user._id };
    
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get unread count
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      isRead: false 
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification stats
// @route   GET /api/notifications/stats
// @access  Private
exports.getNotificationStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });
    
    const todayCount = await Notification.countDocuments({
      recipient: userId,
      createdAt: { $gte: today }
    });
    
    const criticalCount = await Notification.countDocuments({
      recipient: userId,
      priority: 'urgent',
      isRead: false
    });
    
    // Group by type
    const byType = await Notification.aggregate([
      { $match: { recipient: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        unreadCount,
        todayCount,
        criticalCount,
        byType
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    res.json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create notification (internal use, also exposed for admin)
// @route   POST /api/notifications
// @access  Private (Admin)
exports.createNotification = async (req, res, next) => {
  try {
    const { recipientId, type, title, message, priority, data } = req.body;

    if (!recipientId || !type || !title || !message) {
      throw new AppError('Missing required fields: recipientId, type, title, message', 400);
    }

    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      priority: priority || 'medium',
      data
    });

    // Emit real-time notification
    emitNotification(recipientId, notification);

    res.status(201).json({
      success: true,
      message: 'Notification created',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create notification for all users (broadcast)
// @route   POST /api/notifications/broadcast
// @access  Private (Super Admin, Hospital Admin)
exports.broadcastNotification = async (req, res, next) => {
  try {
    const { type, title, message, priority, data, roles } = req.body;
    const User = require('../models/NH_User');

    if (!type || !title || !message) {
      throw new AppError('Missing required fields: type, title, message', 400);
    }

    // Get target users
    const query = { isActive: true };
    if (roles && roles.length > 0) {
      query.role = { $in: roles };
    }
    
    const users = await User.find(query).select('_id');

    // Create notifications for all users
    const notifications = await Notification.insertMany(
      users.map(user => ({
        recipient: user._id,
        type,
        title,
        message,
        priority: priority || 'medium',
        data
      }))
    );

    // Emit real-time notifications
    users.forEach((user, index) => {
      emitNotification(user._id, notifications[index]);
    });

    res.status(201).json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      data: { count: users.length }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/clear-read
// @access  Private
exports.clearReadNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user._id,
      isRead: true
    });

    res.json({
      success: true,
      message: `${result.deletedCount} read notifications cleared`
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create notifications programmatically (for internal use)
exports.createSystemNotification = async (recipientId, type, title, message, data = {}, priority = 'medium') => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      priority,
      data
    });

    // Emit real-time notification
    emitNotification(recipientId, notification);

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};
