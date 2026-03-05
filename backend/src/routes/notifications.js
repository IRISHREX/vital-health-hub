const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/NH_notificationController');
const { authenticate, authorize } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', authenticate, notificationController.getNotifications);

// Get notification stats
router.get('/stats', authenticate, notificationController.getNotificationStats);

// Mark all as read
router.patch('/read-all', authenticate, notificationController.markAllAsRead);

// Clear all read notifications
router.delete('/clear-read', authenticate, notificationController.clearReadNotifications);

// Broadcast notification to users (admin only)
router.post('/broadcast', 
  authenticate, 
  authorize('super_admin', 'hospital_admin'), 
  notificationController.broadcastNotification
);

// Create notification (admin only)
router.post('/', 
  authenticate, 
  authorize('super_admin', 'hospital_admin'), 
  notificationController.createNotification
);

// Get single notification
router.get('/:id', authenticate, notificationController.getNotification);

// Mark single notification as read
router.patch('/:id/read', authenticate, notificationController.markAsRead);
router.patch('/:id/acknowledge', authenticate, notificationController.acknowledgeNotification);

// Delete single notification
router.delete('/:id', authenticate, notificationController.deleteNotification);

module.exports = router;
