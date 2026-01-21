const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/NH_settingsController');
const { authenticate, authorize } = require('../middleware/auth');

// All settings routes require authentication
router.use(authenticate);

// Get all settings (for initial load)
router.get('/', authorize('super_admin', 'hospital_admin'), settingsController.getAllSettings);

// Hospital settings
router.get('/hospital', authorize('super_admin', 'hospital_admin'), settingsController.getHospitalSettings);
router.put('/hospital', authorize('super_admin', 'hospital_admin'), settingsController.updateHospitalSettings);

// Security settings
router.get('/security', authorize('super_admin', 'hospital_admin'), settingsController.getSecuritySettings);
router.put('/security', authorize('super_admin'), settingsController.updateSecuritySettings);

// Notification settings
router.get('/notifications', authorize('super_admin', 'hospital_admin'), settingsController.getNotificationSettings);
router.put('/notifications', authorize('super_admin', 'hospital_admin'), settingsController.updateNotificationSettings);

// User preferences (per-user)
router.get('/preferences', settingsController.getUserPreferences);
router.put('/preferences', settingsController.updateUserPreferences);

// User stats for admin dashboard
router.get('/users/stats', authorize('super_admin', 'hospital_admin'), settingsController.getUserStats);

module.exports = router;
