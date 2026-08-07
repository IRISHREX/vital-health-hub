const ExpenseBase = require('../models/NH_Expense');
const InvoiceBase = require('../models/NH_Invoice');
const BillingLedgerBase = require('../models/NH_BillingLedger');
const { getModel } = require('../utils/tenantModel');
const { nextTenantSequence } = require('../utils/tenantSequence');

const { EXPENSE_MODULES, EXPENSE_CATEGORIES } = ExpenseBase;

const M = (req) => ({
  Expense: getModel(req, 'Expense', ExpenseBase),
  Invoice: getModel(req, 'Invoice', InvoiceBase),
  BillingLedger: getModel(req, 'BillingLedger', BillingLedgerBase),
});

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePaging = (q) => {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 200);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
};

const dateRange = (from, to) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(`${String(to).slice(0, 10)}T23:59:59.999`);
  return Object.keys(range).length ? range : null;
};

/** Ledger revenue categories mapped onto expense/module buckets. */
const LEDGER_MODULE = {
  bed_charges: 'ipd',
  nursing: 'nursing',
  doctor_fee: 'opd',
  medication: 'pharmacy',
  lab_test: 'lab',
  radiology: 'radiology',
  surgery: 'ot',
  procedure: 'ipd',
  other: 'general',
};

const buildQuery = (q) => {
  const query = {};
  const range = dateRange(q.from, q.to);
  if (range) query.date = range;
  if (q.module) query.module = q.module;
  if (q.category) query.category = q.category;
  if (q.status) query.status = q.status;
  if (q.paymentMode) query.paymentMode = q.paymentMode;
  if (q.search) {
    const rx = new RegExp(escapeRegex(String(q.search).trim()), 'i');
    query.$or = [{ description: rx }, { vendorName: rx }, { expenseNumber: rx }, { invoiceReference: rx }];
  }
  return query;
};

const listExpenses = async (req, res) => {
  try {
    const { Expense } = M(req);
    const { limit, page, skip } = parsePaging(req.query);
    const query = buildQuery(req.query);
    const [items, total, totals] = await Promise.all([
      Expense.find(query).populate('recordedBy', 'firstName lastName role')
        .sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: query },
        { $group: { _id: null, amount: { $sum: '$totalAmount' } } },
      ]),
    ]);
    res.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      totalAmount: round2(totals[0]?.amount || 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const { Expense } = M(req);
    const { description, amount } = req.body || {};
    if (!description?.trim()) return res.status(400).json({ message: 'Description is required' });
    if (amount === undefined || Number(amount) < 0 || Number.isNaN(Number(amount))) {
      return res.status(400).json({ message: 'A valid amount is required' });
    }
    const expense = await Expense.create({
      ...req.body,
      amount: Number(amount),
      taxAmount: Number(req.body.taxAmount || 0),
      expenseNumber: await nextTenantSequence(req, 'expense', 'EXP'),
      recordedBy: req.user._id,
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const IMMUTABLE = ['_id', 'expenseNumber', 'recordedBy', 'createdAt', 'updatedAt', 'sourceType', 'sourceId'];

const updateExpense = async (req, res) => {
  try {
    const { Expense } = M(req);
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.sourceType !== 'manual') {
      return res.status(400).json({ message: 'System-posted expenses cannot be edited' });
    }
    Object.entries(req.body || {}).forEach(([key, value]) => {
      if (IMMUTABLE.includes(key)) return;
      expense[key] = value;
    });
    expense.lastUpdatedBy = req.user._id;
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const cancelExpense = async (req, res) => {
  try {
    const { Expense } = M(req);
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    expense.status = 'cancelled';
    expense.notes = req.body?.reason || expense.notes;
    expense.lastUpdatedBy = req.user._id;
    await expense.save();
    res.json({ success: true, expense });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Profit & loss: revenue (collected) vs expenses, split per module so each
 * department's contribution is visible.
 */
const getProfitAndLoss = async (req, res) => {
  try {
    const { Expense, Invoice, BillingLedger } = M(req);
    const range = dateRange(req.query.from, req.query.to);
    const expenseMatch = { status: { $ne: 'cancelled' } };
    if (range) expenseMatch.date = range;
    const invoiceMatch = {};
    if (range) invoiceMatch.createdAt = range;

    const [expenseByModule, expenseByCategory, invoiceTotals, ledgerByCategory] = await Promise.all([
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: '$module', amount: { $sum: '$totalAmount' } } },
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: '$category', amount: { $sum: '$totalAmount' } } },
        { $sort: { amount: -1 } },
      ]),
      Invoice.aggregate([
        { $match: { ...invoiceMatch, status: { $nin: ['cancelled'] } } },
        {
          $group: {
            _id: null,
            billed: { $sum: '$totalAmount' },
            collected: { $sum: '$paidAmount' },
            due: { $sum: '$dueAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      BillingLedger.aggregate([
        { $match: range ? { createdAt: range } : {} },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } },
      ]),
    ]);

    const expenseMap = new Map(expenseByModule.map((e) => [e._id || 'general', round2(e.amount)]));
    const revenueMap = new Map();
    ledgerByCategory.forEach((row) => {
      const key = LEDGER_MODULE[row._id] || 'general';
      revenueMap.set(key, round2((revenueMap.get(key) || 0) + Number(row.amount || 0)));
    });

    const moduleKeys = Array.from(new Set([...revenueMap.keys(), ...expenseMap.keys()]));
    const modules = moduleKeys.map((key) => {
      const revenue = round2(revenueMap.get(key) || 0);
      const expense = round2(expenseMap.get(key) || 0);
      return {
        module: key,
        revenue,
        expense,
        profit: round2(revenue - expense),
        margin: revenue > 0 ? round2(((revenue - expense) / revenue) * 100) : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const invoice = invoiceTotals[0] || { billed: 0, collected: 0, due: 0, count: 0 };
    const totalExpense = round2(expenseByModule.reduce((s, e) => s + Number(e.amount || 0), 0));
    const totalRevenue = round2(invoice.collected || 0);

    res.json({
      range: { from: req.query.from || null, to: req.query.to || null },
      revenue: {
        billed: round2(invoice.billed),
        collected: totalRevenue,
        due: round2(invoice.due),
        invoices: invoice.count,
      },
      expense: {
        total: totalExpense,
        byCategory: expenseByCategory.map((c) => ({ category: c._id || 'other', amount: round2(c.amount) })),
      },
      profit: round2(totalRevenue - totalExpense),
      margin: totalRevenue > 0 ? round2(((totalRevenue - totalExpense) / totalRevenue) * 100) : 0,
      modules,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getExpenseMeta = async (_req, res) => {
  res.json({ modules: EXPENSE_MODULES, categories: EXPENSE_CATEGORIES });
};

module.exports = {
  listExpenses,
  createExpense,
  updateExpense,
  cancelExpense,
  getProfitAndLoss,
  getExpenseMeta,
  LEDGER_MODULE,
};
