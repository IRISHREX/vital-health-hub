const express = require('express');
const router = express.Router();
const { authenticateGrandmaster, requireGrandmaster } = require('../middleware/grandmasterAuth');
const authCtrl = require('../controllers/GM_authController');
const orgCtrl = require('../controllers/GM_organizationController');
const subCtrl = require('../controllers/GM_subscriptionController');
const monCtrl = require('../controllers/GM_monitoringController');
const noticeCtrl = require('../controllers/GM_noticeController');
const configCtrl = require('../controllers/GM_configController');

// ─── Auth (public) ───
router.post('/auth/login', authCtrl.login);

// ─── All routes below require grandmaster auth ───
router.use(authenticateGrandmaster);

// Auth - current user
router.get('/auth/me', authCtrl.getMe);

// Admin management (grandmaster only for create/delete)
router.get('/admins', authCtrl.listAdmins);
router.post('/admins', requireGrandmaster, authCtrl.createAdmin);
router.put('/admins/:id', requireGrandmaster, authCtrl.updateAdmin);
router.delete('/admins/:id', requireGrandmaster, authCtrl.deleteAdmin);

// Organizations
router.get('/organizations', orgCtrl.list);
router.get('/organizations/:id', orgCtrl.getById);
router.post('/organizations', orgCtrl.onboard);
router.put('/organizations/:id', orgCtrl.update);
router.put('/organizations/:id/modules', orgCtrl.updateModules);
router.post('/organizations/:id/suspend', orgCtrl.suspend);
router.post('/organizations/:id/reactivate', orgCtrl.reactivate);
router.delete('/organizations/:id', requireGrandmaster, orgCtrl.remove);

// Subscription Plans
router.get('/plans', subCtrl.listPlans);
router.post('/plans', subCtrl.createPlan);
router.put('/plans/:id', subCtrl.updatePlan);
router.delete('/plans/:id', requireGrandmaster, subCtrl.deletePlan);

// Subscriptions
router.get('/subscriptions', subCtrl.listSubscriptions);
router.post('/subscriptions', subCtrl.createSubscription);
router.post('/subscriptions/:id/payment', subCtrl.recordPayment);
router.post('/subscriptions/:id/cancel', subCtrl.cancelSubscription);
router.post('/subscriptions/check-expired', subCtrl.checkExpiredSubscriptions);

// Monitoring
router.get('/monitoring/stats', monCtrl.platformStats);
router.get('/monitoring/organizations/:id', monCtrl.orgStats);
router.get('/monitoring/recent', monCtrl.recentOnboarded);

// Notices
router.get('/notices', noticeCtrl.list);
router.post('/notices', noticeCtrl.create);
router.put('/notices/:id', noticeCtrl.update);
router.delete('/notices/:id', noticeCtrl.remove);

// Platform Config
router.get('/config', configCtrl.list);
router.get('/config/:key', configCtrl.get);
router.put('/config', configCtrl.upsert);
router.delete('/config/:key', requireGrandmaster, configCtrl.remove);

module.exports = router;
