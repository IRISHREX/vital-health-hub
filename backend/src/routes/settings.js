const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/NH_settingsController');
const { authenticate, authorize } = require('../middleware/auth');

// All settings routes require authentication
router.use(authenticate);

// Get all settings (for initial load)
router.get('/', authorize('super_admin', 'hospital_admin'), settingsController.getAllSettings);

// Hospital settings (GET is open to all authenticated users for display in reports/prints)
router.get('/hospital', settingsController.getHospitalSettings);
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

// Visual access settings (GET for all authenticated users so UI can resolve effective permissions)
router.get('/visual-access', settingsController.getVisualAccessSettings);
router.put('/visual-access', settingsController.updateVisualAccessSettings);
router.post('/access-requests', settingsController.createAccessRequest);
router.get('/access-requests/pending', settingsController.getPendingAccessRequests);
router.patch('/access-requests/:id/respond', settingsController.respondToAccessRequest);

// Data management (bulk import/export & scheduler) - Super Admin only
router.get('/data-management', authorize('super_admin'), settingsController.getDataManagementSettings);
router.put('/data-management', authorize('super_admin'), settingsController.updateDataManagementSettings);
router.get('/data-management/template', authorize('super_admin'), settingsController.getDataImportTemplate);
router.post('/data-management/import', authorize('super_admin'), settingsController.bulkImportData);
router.get('/data-management/export', authorize('super_admin'), settingsController.exportDataByEntity);
router.post('/data-management/run-auto-export', authorize('super_admin'), settingsController.runAutoExportNow);

module.exports = router;
