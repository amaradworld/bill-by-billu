const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');

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
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('List expenses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    const gstAmount = Number(data.amount) * Number(data.gstRate) / 100;

    const expense = await prisma.expense.create({
      data: {
        userId: req.userId,
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description,
        amount: data.amount,
        category: data.category || null,
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
    if (data.amount && data.gstRate) {
      data.gstAmount = Number(data.amount) * Number(data.gstRate) / 100;
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
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
