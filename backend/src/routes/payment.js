const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { decrypt } = require('../services/crypto');
const logger = require('../logger');

// ─── Authenticated routes ───
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

    // Decrypt Razorpay credentials
    const auth = Buffer.from(`${user.razorpayKeyId}:${decrypt(user.razorpayKeySecret)}`).toString('base64');

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

// ─── Razorpay Webhook (unauthenticated) ───
const webhookRouter = express.Router();

// Razorpay sends raw body — need to capture it for signature verification
webhookRouter.use(express.raw({ type: 'application/json' }));

webhookRouter.post('/webhook/razorpay', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.warn('RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification');
    }

    // Verify signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex');

      if (signature !== expectedSig) {
        logger.warn('Invalid Razorpay webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(req.body.toString());
    logger.info({ event: event.event }, 'Razorpay webhook received');

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment) return res.json({ received: true });

      const invoiceId = payment.notes?.invoice_id || payment.receipt;
      if (!invoiceId) return res.json({ received: true });

      // Find and update the invoice
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        logger.warn({ invoiceId }, 'Invoice not found for webhook payment');
        return res.json({ received: true });
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: 'PAID',
          status: 'PAID',
          paymentMethod: payment.method || 'Razorpay',
          paymentDate: new Date(payment.created_at * 1000),
          paymentRef: payment.id,
        },
      });

      logger.info({ invoiceId, paymentId: payment.id }, 'Invoice marked as PAID via webhook');
    }

    // Handle payment.failed event
    if (event.event === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        logger.warn({ paymentId: payment.id, error: payment.error_description }, 'Razorpay payment failed');
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Webhook processing error');
    res.json({ received: true }); // Always return 200 to Razorpay
  }
});

module.exports.webhookRouter = webhookRouter;
