const express = require('express');
const router = express.Router();
const {
    getKpis,
    getFinancialReport,
    getAdmissionsReport,
    getPrescriptionsReport,
    getBillingReport,
    getAnalyzerReport
} = require('../controllers/NH_reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/kpis', authenticate, getKpis);
router.get('/financial', authenticate, authorize('hospital_admin', 'super_admin', 'billing_staff'), getFinancialReport);
router.get('/admissions', authenticate, authorize('hospital_admin', 'super_admin'), getAdmissionsReport);
router.get('/prescriptions', authenticate, authorize('hospital_admin', 'super_admin', 'doctor'), getPrescriptionsReport);
router.get('/billing', authenticate, authorize('hospital_admin', 'super_admin', 'billing_staff'), getBillingReport);
router.get('/analyzer', authenticate, authorize('hospital_admin', 'super_admin', 'billing_staff', 'head_nurse'), getAnalyzerReport);

module.exports = router;
