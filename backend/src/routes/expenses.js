const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/NH_expenseController');

const router = express.Router();

const ADMIN = ['super_admin', 'hospital_admin'];
const VIEW = ['super_admin', 'hospital_admin', 'billing_staff'];

router.get('/meta', authenticate, c.getExpenseMeta);
router.get('/pnl', authenticate, authorize(...VIEW), c.getProfitAndLoss);

router.route('/')
  .get(authenticate, authorize(...VIEW), c.listExpenses)
  .post(authenticate, authorize(...ADMIN, 'billing_staff'), c.createExpense);

router.route('/:id')
  .put(authenticate, authorize(...ADMIN), c.updateExpense)
  .delete(authenticate, authorize(...ADMIN), c.cancelExpense);

module.exports = router;
