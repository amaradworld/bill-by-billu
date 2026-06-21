const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  unitPrice: z.number().positive(),
  unit: z.string().default('NOS'),
  gstRate: z.number().min(0).max(28).default(18),
  category: z.string().optional(),
});

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { search, category, active = 'true', page = 1, limit = 100 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit), 1), 200);
    const safePage = Math.max(Number(page), 1);
    const where = { userId: req.userId };
    if (active === 'true') where.isActive = true;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { hsnCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page: safePage, limit: safeLimit });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        userId: req.userId,
        name: data.name,
        description: data.description || null,
        hsnCode: data.hsnCode || null,
        unitPrice: data.unitPrice,
        unit: data.unit,
        gstRate: data.gstRate,
        category: data.category || null,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });
    res.json(product);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error({ err }, 'Update product error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    logger.error({ err }, 'Delete product error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
