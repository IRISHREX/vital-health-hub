const express = require('express');
const SubscriptionPlan = require('../models/GM_SubscriptionPlan');

const router = express.Router();

// Public list of active subscription plans (no auth)
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1, priceMonthly: 1 });
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
});

// Public contact / lead capture (logs only — wire up to email later)
router.post('/contact', async (req, res) => {
  const { name, email, phone, organization, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'name, email and message are required' });
  }
  // eslint-disable-next-line no-console
  console.log('[Public Contact]', { name, email, phone, organization, message, at: new Date().toISOString() });
  res.json({ success: true, message: 'Thanks! We will get back to you shortly.' });
});

module.exports = router;
