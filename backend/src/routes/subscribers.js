const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const logger = require('../logger');

const router = express.Router();

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(100).optional(),
  source: z.string().max(50).optional(),
});

// POST /api/subscribers — Public: subscribe to email list
router.post('/', async (req, res) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { email, name, source } = parsed.data;

    // Check if already subscribed
    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      if (existing.active) {
        return res.status(200).json({ message: 'You are already subscribed!' });
      }
      // Re-activate
      const updated = await prisma.subscriber.update({
        where: { email },
        data: { active: true, name: name || existing.name, source: source || existing.source },
      });
      logger.info({ email }, 'Subscriber re-activated');
      return res.json({ message: 'Welcome back! You have been re-subscribed.' });
    }

    const subscriber = await prisma.subscriber.create({
      data: { email, name: name || null, source: source || 'landing_page' },
    });

    logger.info({ email, source }, 'New subscriber');
    res.status(201).json({ message: 'Successfully subscribed! Thank you.' });
  } catch (err) {
    logger.error('Subscribe error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/subscribers/unsubscribe — Public: unsubscribe via email
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const subscriber = await prisma.subscriber.findUnique({ where: { email } });
    if (!subscriber) {
      return res.status(200).json({ message: 'You have been unsubscribed.' });
    }

    await prisma.subscriber.update({ where: { email }, data: { active: false } });
    logger.info({ email }, 'Subscriber unsubscribed');
    res.json({ message: 'You have been unsubscribed.' });
  } catch (err) {
    logger.error('Unsubscribe error:', err.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;
