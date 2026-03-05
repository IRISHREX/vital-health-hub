const express = require('express');
const router = express.Router();
const {
    getKpis,
    getFinancialReport,
    getAdmissionsReport
} = require('../controllers/NH_reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/kpis', authenticate, getKpis);
router.get('/financial', authenticate, authorize('hospital_admin', 'super_admin', 'billing_staff'), getFinancialReport);
router.get('/admissions', authenticate, authorize('hospital_admin', 'super_admin'), getAdmissionsReport);

module.exports = router;
