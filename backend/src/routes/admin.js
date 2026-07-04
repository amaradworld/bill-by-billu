const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { authenticate, JWT_SECRET } = require('../middlewares/auth');
const logger = require('../logger');

const router = express.Router();

const PLATFORM_OWNER = 'amaradworld@gmail.com';

// POST /api/admin/login — Admin login (only amaradworld@gmail.com)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (email.toLowerCase() !== PLATFORM_OWNER) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, admin: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info({ userId: user.id, email: user.email }, 'Admin login');

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, businessName: user.businessName },
    });
  } catch (err) {
    logger.error('Admin login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware: require admin JWT
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// GET /api/admin/me — Verify admin token
router.get('/me', requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, businessName: true },
    });
    if (!user || user.email !== PLATFORM_OWNER) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/payments — List all payment requests
router.get('/payments', requireAdmin, async (req, res) => {
  try {
    const requests = await prisma.paymentRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, businessName: true } } },
    });
    res.json(requests);
  } catch (err) {
    logger.error('Admin list payments error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/payments/:id/approve — Approve a payment request
router.post('/payments/:id/approve', requireAdmin, async (req, res) => {
  try {
    const paymentRequest = await prisma.paymentRequest.findUnique({ where: { id: req.params.id } });
    if (!paymentRequest) return res.status(404).json({ error: 'Request not found' });
    if (paymentRequest.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    const now = new Date();
    let expiry;
    if (paymentRequest.period === 'yearly') {
      expiry = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      expiry = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: paymentRequest.userId },
        data: { plan: paymentRequest.plan, planExpiry: expiry },
      }),
      prisma.paymentRequest.update({
        where: { id: paymentRequest.id },
        data: { status: 'approved' },
      }),
    ]);

    logger.info({ requestId: paymentRequest.id, userId: paymentRequest.userId, plan: paymentRequest.plan }, 'Admin: payment approved');
    res.json({ success: true });
  } catch (err) {
    logger.error('Admin approve error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/payments/:id/reject — Reject a payment request
router.post('/payments/:id/reject', requireAdmin, async (req, res) => {
  try {
    const paymentRequest = await prisma.paymentRequest.findUnique({ where: { id: req.params.id } });
    if (!paymentRequest) return res.status(404).json({ error: 'Request not found' });
    if (paymentRequest.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    await prisma.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: { status: 'rejected' },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Admin reject error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Subscribers ───

// POST /api/admin/upgrade — Manually upgrade a user's plan (admin only)
router.post('/upgrade', requireAdmin, async (req, res) => {
  try {
    const { userId, plan, period = 'monthly' } = req.body;
    if (!userId || !plan || !['STARTER', 'GROWTH'].includes(plan)) {
      return res.status(400).json({ error: 'userId and valid plan (STARTER/GROWTH) required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    let expiry;
    if (period === 'yearly') {
      expiry = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      expiry = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { plan, planExpiry: expiry },
      select: { id: true, email: true, name: true, plan: true, planExpiry: true },
    });

    logger.info({ adminId: req.userId, targetUserId: userId, plan, expiry }, 'Admin: manually upgraded user');
    res.json({ success: true, user: updated });
  } catch (err) {
    logger.error('Admin upgrade error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users — List all users (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: { id: true, email: true, name: true, businessName: true, plan: true, planExpiry: true, trialEndsAt: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    logger.error('Admin list users error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/razorpay/payments — Check Razorpay payments via API (admin only)
router.get('/razorpay/payments', requireAdmin, async (req, res) => {
  try {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(400).json({ error: 'Razorpay not configured' });
    }

    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const params = new URLSearchParams({ count: '20', skip: req.query.skip || '0' });
    const razorpayRes = await fetch(`https://api.razorpay.com/v1/payments?${params}`, {
      headers: { 'Authorization': `Basic ${auth}` },
    });
    const payments = await razorpayRes.json();
    res.json(payments);
  } catch (err) {
    logger.error('Admin Razorpay payments error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Subscribers ───

// GET /api/admin/subscribers — List all subscribers (admin only)
router.get('/subscribers', requireAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status === 'active') where.active = true;
    else if (status === 'unsubscribed') where.active = false;

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [subscribers, total, activeCount, unsubscribedCount] = await prisma.$transaction([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        select: { id: true, email: true, name: true, source: true, active: true, createdAt: true },
      }),
      prisma.subscriber.count({ where }),
      prisma.subscriber.count({ where: { active: true } }),
      prisma.subscriber.count({ where: { active: false } }),
    ]);

    res.json({
      subscribers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
      stats: { total, active: activeCount, unsubscribed: unsubscribedCount },
    });
  } catch (err) {
    logger.error('Admin list subscribers error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/subscribers/:id — Remove subscriber (admin only)
router.delete('/subscribers/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.subscriber.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('Admin delete subscriber error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
