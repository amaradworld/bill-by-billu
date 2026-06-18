const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate, JWT_SECRET } = require('../middlewares/auth');
const { validateGSTIN, extractStateFromGSTIN } = require('../services/gst');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(8),
  name: z.string().min(2),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  invoicePrefix: z.string().optional(),
  currency: z.string().optional(),
  whatsappNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Validate GSTIN if provided
    if (data.gstNumber && !validateGSTIN(data.gstNumber)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    // Auto-detect state from GSTIN
    let state = data.state;
    if (data.gstNumber && !state) {
      state = extractStateFromGSTIN(data.gstNumber);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone || null,
        passwordHash,
        name: data.name,
        businessName: data.businessName || null,
        gstNumber: data.gstNumber || null,
        panNumber: data.panNumber || null,
        address: data.address || null,
        city: data.city || null,
        state: state || null,
        pincode: data.pincode || null,
        invoicePrefix: data.invoicePrefix || 'INV',
        currency: data.currency || 'INR',
        whatsappNumber: data.whatsappNumber || null,
      },
      select: {
        id: true, email: true, phone: true, name: true,
        businessName: true, gstNumber: true, plan: true,
        invoicePrefix: true, currency: true, whatsappNumber: true,
        createdAt: true,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, phone: true, name: true,
        businessName: true, gstNumber: true, panNumber: true,
        address: true, city: true, state: true, pincode: true,
        logoUrl: true, plan: true, invoicePrefix: true, currency: true, whatsappNumber: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const data = registerSchema.partial().parse(req.body);

    if (data.gstNumber && !validateGSTIN(data.gstNumber)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: {
        id: true, email: true, phone: true, name: true,
        businessName: true, gstNumber: true, panNumber: true,
        address: true, city: true, state: true, pincode: true,
        plan: true, invoicePrefix: true, currency: true, whatsappNumber: true,
      },
    });
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
