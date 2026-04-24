const express = require('express');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/NH_approvalController');

const router = express.Router();
router.use(authenticate);

// Rules
router.get('/rules', c.listRules);
router.post('/rules', c.createRule);
router.put('/rules/:id', c.updateRule);
router.delete('/rules/:id', c.deleteRule);

// Lookup
router.get('/applicable', c.findApplicableRule);

// Requests
router.get('/requests', c.listRequests);
router.post('/requests', c.createRequest);
router.patch('/requests/:id/respond', c.respondToRequest);
router.patch('/requests/:id/reassign', c.reassignRequest);

// Escalation cron (can be called by scheduler / admins)
router.post('/escalate', c.escalateOverdue);

module.exports = router;
