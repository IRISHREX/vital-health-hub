const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_hrmsRosterController');

const router = express.Router();
const ADMIN_ROLES = ['super_admin', 'hospital_admin'];

// Shift templates
router.route('/shift-templates')
  .get(authenticate, c.listShiftTemplates)
  .post(authenticate, authorize(...ADMIN_ROLES), c.createShiftTemplate);
router.route('/shift-templates/:id')
  .put(authenticate, authorize(...ADMIN_ROLES), c.updateShiftTemplate)
  .delete(authenticate, authorize(...ADMIN_ROLES), c.deleteShiftTemplate);

// Roster
router.get('/roster', authenticate, c.listRoster);
router.post('/roster/assignment', authenticate, authorize(...ADMIN_ROLES), c.upsertAssignment);
router.post('/roster/generate', authenticate, authorize(...ADMIN_ROLES), c.bulkGenerateRoster);
router.post('/roster/publish', authenticate, authorize(...ADMIN_ROLES), c.publishRoster);
router.post('/roster/:id/cancel', authenticate, authorize(...ADMIN_ROLES), c.cancelAssignment);
router.get('/roster/hour-rollup', authenticate, c.hourRollup);

// Shift swaps
router.get('/swaps', authenticate, c.listSwapRequests);
router.post('/swaps', authenticate, c.createSwapRequest);
router.post('/swaps/:id/respond', authenticate, c.respondToSwap);
router.post('/swaps/:id/decide', authenticate, authorize(...ADMIN_ROLES), c.decideSwap);
router.post('/swaps/:id/apply', authenticate, authorize(...ADMIN_ROLES), c.applySwap);

module.exports = router;
