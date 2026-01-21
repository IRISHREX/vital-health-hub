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


const router = express.Router();

// API v1 routes with nh prefix
const v1Router = express.Router();

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

// Health check
v1Router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount v1 routes under nh/api/v1
router.use('/nh/api/v1', v1Router);

module.exports = router;
