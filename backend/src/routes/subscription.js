const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate, JWT_SECRET } = require('../middlewares/auth');
const { decrypt } = require('../services/crypto');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

// Plan pricing
const PLANS = {
  FREE: { name: 'Free', price: 0, invoices: 10, features: ['10 invoices/month', 'Basic invoicing', 'GST calculation', 'WhatsApp sharing'] },
  STARTER: { name: 'Starter', price: 299, monthlyPrice: 299, yearlyPrice: 2990, invoices: -1, features: ['Unlimited invoices', 'GST reports (GSTR-1)', 'Credit/Debit notes', 'Recurring invoices', 'Customer management', 'Product catalog'] },
  PRO: { name: 'Pro', price: 799, monthlyPrice: 799, yearlyPrice: 7990, invoices: -1, features: ['Everything in Starter', 'AI invoice creation', 'AI business insights', 'Payment reminders', 'Multi-user access', 'API access', 'Priority support'] },
};

// GET /api/subscription/plans — List available plans
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// GET /api/subscription/status — Current plan status
router.get('/status', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { plan: true, planExpiry: true, createdAt: true },
    });

    const thisMonthCount = await prisma.invoice.count({
      where: { userId: req.userId, invoiceDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    });

    const planInfo = PLANS[user.plan] || PLANS.FREE;
    const isExpired = user.planExpiry && new Date(user.planExpiry) < new Date();

    res.json({
      plan: isExpired ? 'FREE' : user.plan,
      planExpiry: user.planExpiry,
      invoicesUsed: thisMonthCount,
      invoicesLimit: planInfo.invoices,
      invoicesRemaining: planInfo.invoices === -1 ? -1 : Math.max(0, planInfo.invoices - thisMonthCount),
      features: planInfo.features,
      isExpired,
    });
  } catch (err) {
    logger.error('Subscription status error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription/create-order — Create Razorpay order for subscription
router.post('/create-order', async (req, res) => {
  try {
    const { plan, period } = req.body;
    if (!plan || !['STARTER', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be STARTER or PRO.' });
    }
    if (!period || !['monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be monthly or yearly.' });
    }

    const planInfo = PLANS[plan];
    const amount = period === 'yearly' ? planInfo.yearlyPrice : planInfo.monthlyPrice;

    // Check if Razorpay is configured via platform keys or user keys
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    let razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    let razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId && user.razorpayKeyId) {
      razorpayKeyId = user.razorpayKeyId;
      razorpayKeySecret = decrypt(user.razorpayKeySecret);
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(400).json({ error: 'Payment gateway not configured. Contact support.' });
    }

    // Create Razorpay order
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount * 100, // paise
        currency: 'INR',
        receipt: `sub_${req.userId.slice(0, 16)}_${plan}_${period}_${Date.now()}`,
        notes: { userId: req.userId, plan, period, type: 'subscription' },
      }),
    });

    if (!razorpayRes.ok) {
      const err = await razorpayRes.json();
      logger.error({ err }, 'Razorpay order creation failed');
      return res.status(500).json({ error: 'Failed to create payment order' });
    }

    const order = await razorpayRes.json();
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId,
      plan,
      period,
      amountDisplay: `₹${amount.toLocaleString('en-IN')}`,
    });
  } catch (err) {
    logger.error('Create subscription order error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription/verify — Verify Razorpay payment and activate plan
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, period } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    // Verify signature
    let razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!razorpayKeySecret && user.razorpayKeySecret) {
      razorpayKeySecret = decrypt(user.razorpayKeySecret);
    }

    if (!razorpayKeySecret) {
      return res.status(500).json({ error: 'Payment verification not configured. Contact support.' });
    }

    const expectedSig = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Timing-safe comparison
    const sigBuf = Buffer.from(razorpay_signature, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return res.status(401).json({ error: 'Invalid payment signature' });
    }

    // Calculate expiry
    const now = new Date();
    let expiry;
    if (period === 'yearly') {
      expiry = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      expiry = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    // Update user plan
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { plan, planExpiry: expiry },
      select: { id: true, plan: true, planExpiry: true },
    });

    logger.info({ userId: req.userId, plan, expiry }, 'Plan upgraded');
    res.json({ success: true, plan: updated.plan, planExpiry: updated.planExpiry });
  } catch (err) {
    logger.error('Verify subscription error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription/cancel — Cancel subscription (downgrade to FREE)
router.post('/cancel', async (req, res) => {
  try {
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { plan: 'FREE', planExpiry: null },
      select: { id: true, plan: true },
    });
    res.json({ success: true, plan: updated.plan });
  } catch (err) {
    logger.error('Cancel subscription error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
