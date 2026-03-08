const express = require('express');
const authRoutes = require('./auth');
const appointmentRoutes = require('./appointments');
const bedRoutes = require('./beds');
const doctorRoutes = require('./doctors');
const patientRoutes = require('./patients');
const userRoutes = require('./users');
const facilityRoutes = require('./facilities');
const invoiceRoutes = require('./invoices');
const reportRoutes = require('./reports');
const admissionRoutes = require('./admissions');
const settingsRoutes = require('./settings');
const notificationRoutes = require('./notifications');
const vitalsRoutes = require('./vitals');
const nurseRoutes = require('./nurse');
const dashboardRoutes = require('./dashboard');
const serviceOrderRoutes = require('./serviceOrders');
const billingRoutes = require('./billing');
const { resolveTenant } = require('../middleware/tenantResolver');

const router = express.Router();

// API v1 routes with nh prefix
const v1Router = express.Router();

// Health check (kept before tenant resolution)
v1Router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Attach tenant context for NH routes using x-org-slug or subdomain
v1Router.use(resolveTenant);

v1Router.use('/auth', authRoutes);
v1Router.use('/appointments', appointmentRoutes);
v1Router.use('/beds', bedRoutes);
v1Router.use('/doctors', doctorRoutes);
v1Router.use('/patients', patientRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/facilities', facilityRoutes);
v1Router.use('/invoices', invoiceRoutes);
v1Router.use('/reports', reportRoutes);
v1Router.use('/admissions', admissionRoutes);
v1Router.use('/settings', settingsRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/vitals', vitalsRoutes);
v1Router.use('/tasks', require('./tasks'));
v1Router.use('/nurse', nurseRoutes);
v1Router.use('/dashboard', dashboardRoutes);
v1Router.use('/service-orders', serviceOrderRoutes);
v1Router.use('/billing', billingRoutes);
v1Router.use('/lab-tests', require('./labTests'));
v1Router.use('/pharmacy', require('./pharmacy'));
v1Router.use('/personal-permissions', require('./personalPermissions'));
v1Router.use('/doctor-dashboard', require('./doctorDashboard'));
v1Router.use('/radiology', require('./radiology'));
v1Router.use('/ot', require('./ot'));
v1Router.use('/service-catalog', require('./serviceCatalog'));
v1Router.use('/room-type-services', require('./roomTypeServices'));

// Mount v1 routes under nh/api/v1
router.use('/nh/api/v1', v1Router);

// Grandmaster routes (separate namespace)
router.use('/gm/api/v1', require('./grandmaster'));

module.exports = router;
