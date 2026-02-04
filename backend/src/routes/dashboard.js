const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dashboardController = require('../controllers/NH_dashboardController');

router.get('/', authenticate, dashboardController.getDashboard);

module.exports = router;
