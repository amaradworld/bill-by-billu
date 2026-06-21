const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { categorizeExpense, suggestCategories } = require('../services/ai');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

const expenseSchema = z.object({
  date: z.string().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().optional(),
  gstRate: z.number().min(0).max(28).default(0),
  isDeductible: z.boolean().default(true),
  receiptUrl: z.string().url().optional(),
});

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { category, from, to, page = 1, limit = 100 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit), 1), 200);
    const safePage = Math.max(Number(page), 1);
    const where = { userId: req.userId };
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total, page: safePage, limit: safeLimit });
  } catch (err) {
    console.error('List expenses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/expenses/suggest-category?q=uber ride
router.get('/suggest-category', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ suggestions: [] });
    const suggestions = suggestCategories(q);
    res.json({ suggestions });
  } catch (err) {
    console.error('Suggest category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    const gstAmount = Number(data.amount) * Number(data.gstRate) / 100;

    // Auto-categorize using AI if no category provided
    const category = data.category || categorizeExpense(data.description);

    const expense = await prisma.expense.create({
      data: {
        userId: req.userId,
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description,
        amount: data.amount,
        category,
        gstRate: data.gstRate,
        gstAmount,
        isDeductible: data.isDeductible,
        receiptUrl: data.receiptUrl || null,
      },
    });
    res.status(201).json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/expenses/stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisMonthData, totalData] = await Promise.all([
      prisma.expense.aggregate({
        where: { userId: req.userId, date: { gte: thisMonth } },
        _sum: { amount: true, gstAmount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { userId: req.userId },
        _sum: { amount: true, gstAmount: true },
        _count: true,
      }),
    ]);

    res.json({
      thisMonth: {
        amount: Number(thisMonthData._sum.amount || 0),
        gst: Number(thisMonthData._sum.gstAmount || 0),
        count: thisMonthData._count,
      },
      allTime: {
        amount: Number(totalData._sum.amount || 0),
        gst: Number(totalData._sum.gstAmount || 0),
        count: totalData._count,
      },
    });
  } catch (err) {
    console.error('Expense stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const data = expenseSchema.partial().parse(req.body);
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    if (data.amount || data.gstRate) {
      const amt = Number(data.amount || existing.amount);
      const rate = Number(data.gstRate || existing.gstRate);
      data.gstAmount = amt * rate / 100;
    }
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data,
    });
    res.json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error({ err }, 'Update expense error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    logger.error({ err }, 'Delete expense error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
