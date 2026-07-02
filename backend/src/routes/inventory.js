const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

const itemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().nullable(),
  hsnCode: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
  unit: z.string().default('NOS'),
  costPrice: z.number().min(0).default(0),
  sellPrice: z.number().min(0).default(0),
  gstRate: z.number().min(0).max(28).default(18),
  lowStockThreshold: z.number().int().min(0).default(10),
});

const adjustSchema = z.object({
  adjustment: z.number().int(),
  reason: z.string().min(1),
});

// GET /api/inventory/stats — must be before /:id
router.get('/stats', async (req, res) => {
  try {
    const where = { userId: req.userId };
    const [totalItems, aggregation, lowStockCount] = await Promise.all([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.aggregate({ where, _sum: { costPrice: true, quantity: true } }),
      prisma.inventoryItem.count({ where: { ...where, quantity: { lt: prisma.inventoryItem.fields?.lowStockThreshold ?? 10 } } }),
    ]);

    // Compute low stock count manually since Prisma can't reference fields in where
    const allItems = await prisma.inventoryItem.findMany({ where, select: { quantity: true, lowStockThreshold: true } });
    const lowStock = allItems.filter(i => i.quantity < i.lowStockThreshold).length;

    const totalValue = allItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);

    res.json({
      totalItems,
      totalValue,
      lowStockCount: lowStock,
    });
  } catch (err) {
    logger.error('Inventory stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/low-stock — items below threshold
router.get('/low-stock', async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { userId: req.userId },
      orderBy: { quantity: 'asc' },
    });
    const lowStockItems = items.filter(i => i.quantity < i.lowStockThreshold);
    res.json({ items: lowStockItems, total: lowStockItems.length });
  } catch (err) {
    logger.error('Low stock error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory — list all items
router.get('/', async (req, res) => {
  try {
    const { search, lowStock, page = 1, limit = 50, sort = 'createdAt', order = 'desc' } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit), 1), 200);
    const safePage = Math.max(Number(page), 1);
    const where = { userId: req.userId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { hsnCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = { [sort]: order === 'asc' ? 'asc' : 'desc' };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Filter low stock in-memory if requested
    let filtered = items;
    if (lowStock === 'true') {
      filtered = items.filter(i => i.quantity < i.lowStockThreshold);
    }

    res.json({ items: filtered, total, page: safePage, limit: safeLimit });
  } catch (err) {
    logger.error('List inventory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory — create item
router.post('/', async (req, res) => {
  try {
    const data = itemSchema.parse(req.body);
    const item = await prisma.inventoryItem.create({
      data: {
        userId: req.userId,
        name: data.name,
        sku: data.sku || null,
        hsnCode: data.hsnCode || null,
        quantity: data.quantity,
        unit: data.unit,
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        gstRate: data.gstRate,
        lowStockThreshold: data.lowStockThreshold,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An item with this SKU already exists' });
    }
    logger.error('Create inventory item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/inventory/:id — update item
router.put('/:id', async (req, res) => {
  try {
    const data = itemSchema.partial().parse(req.body);
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data,
    });
    res.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An item with this SKU already exists' });
    }
    logger.error({ err }, 'Update inventory item error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/inventory/:id — delete item
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    logger.error('Delete inventory item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory/:id/adjust — adjust stock
router.post('/:id/adjust', async (req, res) => {
  try {
    const { adjustment, reason } = adjustSchema.parse(req.body);
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const newQuantity = existing.quantity + adjustment;
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Insufficient stock. Current quantity: ' + existing.quantity });
    }

    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { quantity: newQuantity },
    });
    res.json({ item, adjustment, reason, previousQuantity: existing.quantity, newQuantity });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error('Adjust stock error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
