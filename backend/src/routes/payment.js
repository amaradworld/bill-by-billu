const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

const razorpaySchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
});

// POST /api/payments/razorpay/link — Generate Razorpay payment link
router.post('/razorpay/link', async (req, res) => {
  try {
    const data = razorpaySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user.razorpayKeyId || !user.razorpayKeySecret) {
      return res.status(400).json({ error: 'Razorpay not configured. Add API keys in Settings.' });
    }

    // Verify invoice belongs to this user
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, userId: req.userId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Razorpay Payment Link API
    const auth = Buffer.from(`${user.razorpayKeyId}:${user.razorpayKeySecret}`).toString('base64');

    const razorpayRes = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(data.amount * 100), // paise
        currency: data.currency,
        accept_partial: false,
        description: `Payment for Invoice ${data.invoiceId}`,
        customer: {
          name: data.customerName || user.businessName || user.name,
          email: data.customerEmail || user.email,
          contact: data.customerPhone || user.phone || '',
        },
        notify: {
          sms: true,
          email: true,
        },
        reference_id: data.invoiceId,
        callback_url: `${process.env.FRONTEND_URL || 'https://billbybillu.vercel.app'}/invoices`,
        callback_method: 'get',
      }),
    });

    if (!razorpayRes.ok) {
      const err = await razorpayRes.json();
      logger.error({ err }, 'Razorpay link creation failed');
      return res.status(500).json({ error: 'Failed to create payment link' });
    }

    const link = await razorpayRes.json();

    // Update invoice with payment link
    await prisma.invoice.update({
      where: { id: data.invoiceId, userId: req.userId },
      data: { paymentRef: link.short_url },
    });

    res.json({ short_url: link.short_url, id: link.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error({ err }, 'Payment link error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payments/razorpay/status/:invoiceId
router.get('/razorpay/status/:invoiceId', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.invoiceId, userId: req.userId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.json({
      paymentRef: invoice.paymentRef,
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod,
      paymentDate: invoice.paymentDate,
    });
  } catch (err) {
    logger.error({ err }, 'Payment status check failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
