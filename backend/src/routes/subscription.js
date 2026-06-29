const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate, JWT_SECRET } = require('../middlewares/auth');
const { decrypt } = require('../services/crypto');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

const PAID_PLANS = ['STARTER', 'GROWTH'];

// Plan pricing
const PLANS = {
  FREE: { name: 'Free', price: 0, invoices: 5, features: ['5 invoices/month', 'Basic invoicing', 'GST calculation', 'WhatsApp sharing'] },
  STARTER: { name: 'Starter', price: 199, monthlyPrice: 199, yearlyPrice: 1990, invoices: 100, features: ['100 invoices/month', 'GST reports (GSTR-1)', 'Credit/Debit notes', 'Recurring invoices', 'Customer management', 'Product catalog'] },
  GROWTH: { name: 'Growth', price: 499, monthlyPrice: 499, yearlyPrice: 4990, invoices: 1000, features: ['1,000 invoices/month', 'AI invoice creation', 'AI business insights', 'Payment reminders', 'Multi-user access', 'Priority support'] },
  ENTERPRISE: { name: 'Enterprise', price: 0, monthlyPrice: 0, yearlyPrice: 0, invoices: -1, features: ['Unlimited invoices', 'Everything in Growth', 'API access', 'Custom integrations', 'Dedicated support'] },
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
      select: { plan: true, planExpiry: true, trialEndsAt: true, createdAt: true },
    });

    const thisMonthCount = await prisma.invoice.count({
      where: { userId: req.userId, invoiceDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    });

    const now = new Date();
    const isPaid = PAID_PLANS.includes(user.plan);
    const isPaidActive = isPaid && user.planExpiry && new Date(user.planExpiry) > now;
    const isTrialActive = user.trialEndsAt && new Date(user.trialEndsAt) > now;

    // Resolve effective plan: paid active > trial > free
    let effectivePlan = 'FREE';
    if (isPaidActive) {
      effectivePlan = user.plan;
    } else if (isTrialActive) {
      effectivePlan = 'GROWTH'; // trial gives GROWTH features
    }

    const trialDaysLeft = isTrialActive
      ? Math.ceil((new Date(user.trialEndsAt) - now) / (1000 * 60 * 60 * 24))
      : 0;
    const trialStarted = isTrialActive || (user.trialEndsAt && new Date(user.trialEndsAt) <= now);
    const daysSinceSignup = Math.floor((now - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

    const planInfo = PLANS[effectivePlan] || PLANS.FREE;

    const featureFlags = {
      customLogo: PAID_PLANS.includes(effectivePlan),
      qrUpload: PAID_PLANS.includes(effectivePlan),
      gstReports: PAID_PLANS.includes(effectivePlan),
      creditDebitNotes: PAID_PLANS.includes(effectivePlan),
      recurringInvoices: PAID_PLANS.includes(effectivePlan),
      aiFeatures: effectivePlan === 'GROWTH',
      multiUser: effectivePlan === 'GROWTH',
      apiAccess: effectivePlan === 'GROWTH',
      insights: effectivePlan === 'GROWTH',
      reminders: PAID_PLANS.includes(effectivePlan),
    };

    res.json({
      plan: effectivePlan,
      rawPlan: user.plan,
      planExpiry: user.planExpiry,
      trialEndsAt: user.trialEndsAt,
      isTrialActive,
      trialDaysLeft,
      trialStarted,
      daysSinceSignup,
      invoicesUsed: thisMonthCount,
      invoicesLimit: isTrialActive ? -1 : planInfo.invoices,
      invoicesRemaining: (isTrialActive || isPaidActive) ? -1 : Math.max(0, planInfo.invoices - thisMonthCount),
      features: planInfo.features,
      featureFlags,
      isExpired: !isPaidActive && !isTrialActive && user.plan !== 'FREE',
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
    if (!plan || !['STARTER', 'GROWTH'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be STARTER or GROWTH.' });
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
        receipt: `sub_${plan}_${Date.now().toString(36)}`,
        notes: { userId: req.userId, plan, period, type: 'subscription' },
      }),
    });

    if (!razorpayRes.ok) {
      const err = await razorpayRes.json();
      logger.error({ err, status: razorpayRes.status }, 'Razorpay order creation failed');
      return res.status(500).json({ error: 'Failed to create payment order', detail: err.error?.description || err.message || 'Unknown Razorpay error' });
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
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// POST /api/subscription/verify — Verify Razorpay payment and activate plan
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, period } = req.body;

    logger.info({ userId: req.userId, orderId: razorpay_order_id, plan, period }, 'Verify payment attempt');

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
      logger.error({ userId: req.userId }, 'No Razorpay secret available for verification');
      return res.status(500).json({ error: 'Payment verification not configured. Contact support.' });
    }

    const expectedSig = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Timing-safe comparison
    const sigBuf = Buffer.from(razorpay_signature, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    const sigValid = sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);

    if (!sigValid) {
      logger.error({ userId: req.userId, orderId: razorpay_order_id }, 'Payment signature mismatch');
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

    logger.info({ userId: req.userId, plan, expiry }, 'Plan upgraded via verify');
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

// POST /api/subscription/upi-request — Submit UPI payment request for manual verification
router.post('/upi-request', async (req, res) => {
  try {
    const { plan, period, utrNumber } = req.body;
    if (!plan || !['STARTER', 'GROWTH'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (!period || !['monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const planInfo = PLANS[plan];
    const amount = period === 'yearly' ? planInfo.yearlyPrice : planInfo.monthlyPrice;

    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        userId: req.userId,
        plan,
        period,
        amount: amount * 100, // store in paise
        utrNumber: utrNumber || null,
        status: 'pending',
      },
    });

    logger.info({ userId: req.userId, plan, period, amount }, 'UPI payment request created');
    res.json({ success: true, requestId: paymentRequest.id });
  } catch (err) {
    logger.error('UPI request error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PLATFORM_OWNER = 'amaradworld@gmail.com';

// GET /api/subscription/requests — List pending payment requests (admin only)
router.get('/requests', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.email !== PLATFORM_OWNER) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const requests = await prisma.paymentRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, businessName: true } } },
    });

    res.json(requests);
  } catch (err) {
    logger.error('List payment requests error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription/approve/:requestId — Approve a payment request (admin only)
router.post('/approve/:requestId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.email !== PLATFORM_OWNER) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const paymentRequest = await prisma.paymentRequest.findUnique({ where: { id: req.params.requestId } });
    if (!paymentRequest) return res.status(404).json({ error: 'Request not found' });
    if (paymentRequest.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    // Calculate expiry
    const now = new Date();
    let expiry;
    if (paymentRequest.period === 'yearly') {
      expiry = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      expiry = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    // Update user plan and payment request status
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

    logger.info({ requestId: paymentRequest.id, userId: paymentRequest.userId, plan: paymentRequest.plan }, 'Payment request approved');
    res.json({ success: true });
  } catch (err) {
    logger.error('Approve payment error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription/reject/:requestId — Reject a payment request (admin only)
router.post('/reject/:requestId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.email !== PLATFORM_OWNER) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const paymentRequest = await prisma.paymentRequest.findUnique({ where: { id: req.params.requestId } });
    if (!paymentRequest) return res.status(404).json({ error: 'Request not found' });
    if (paymentRequest.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    await prisma.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: { status: 'rejected' },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Reject payment error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
