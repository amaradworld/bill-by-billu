const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { validateGSTIN, extractStateFromGSTIN } = require('../services/gst');

const router = express.Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  type: z.enum(['B2B', 'B2C']).default('B2C'),
});

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const { search, type, page = 1, limit = 50 } = req.query;
    const where = { userId: req.userId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { invoices: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ customers, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const data = customerSchema.parse(req.body);

    if (data.gstNumber && !validateGSTIN(data.gstNumber)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    let state = data.state;
    if (data.gstNumber && !state) {
      state = extractStateFromGSTIN(data.gstNumber);
    }

    // Auto-set B2B if GSTIN provided
    const type = data.gstNumber ? 'B2B' : data.type;

    const customer = await prisma.customer.create({
      data: {
        userId: req.userId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        gstNumber: data.gstNumber || null,
        address: data.address || null,
        city: data.city || null,
        state: state || null,
        pincode: data.pincode || null,
        type,
      },
    });

    res.status(201).json(customer);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
        _count: { select: { invoices: true } },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const data = customerSchema.partial().parse(req.body);

    if (data.gstNumber && !validateGSTIN(data.gstNumber)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data,
    });
    res.json(customer);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
