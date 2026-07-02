const express = require('express');
const webPush = require('web-push');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const logger = require('../logger');

const router = express.Router();

// VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:amaradworld@gmail.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ─── VAPID public key ───
router.get('/vapid-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ─── Subscribe ───
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Missing push subscription fields' });
    }

    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: req.userId, endpoint } },
      update: { p256dh, auth },
      create: { userId: req.userId, endpoint, p256dh, auth },
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Push subscribe failed');
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// ─── Unsubscribe ───
router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: req.userId, endpoint },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Push unsubscribe failed');
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// ─── Test notification ───
router.post('/test', authenticate, async (req, res) => {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: req.userId },
    });

    if (subs.length === 0) {
      return res.status(400).json({ error: 'No push subscriptions found' });
    }

    const payload = JSON.stringify({
      title: 'Bill By Billu',
      body: 'Push notifications are working!',
      url: '/app/dashboard',
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }

    res.json({ ok: true, sent });
  } catch (err) {
    logger.error({ err }, 'Test notification failed');
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// ─── Notification preferences ───
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { notificationPrefs: true },
    });
    const prefs = user?.notificationPrefs ? JSON.parse(user.notificationPrefs) : { paymentReminders: true, gstDeadlines: true };
    res.json(prefs);
  } catch (err) {
    res.json({ paymentReminders: true, gstDeadlines: true });
  }
});

router.put('/preferences', authenticate, async (req, res) => {
  try {
    const prefs = JSON.stringify(req.body);
    await prisma.user.update({
      where: { id: req.userId },
      data: { notificationPrefs: prefs },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ─── Helper: send notification to user ───
async function sendNotification(userId, title, body, url = '/app/dashboard') {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subs.length === 0) return;

    const payload = JSON.stringify({ title, body, url });

    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  } catch (err) {
    logger.error({ err, userId }, 'sendNotification failed');
  }
}

// ─── Helper: payment reminder ───
async function sendPaymentReminder(userId, customerName, amount, invoiceId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
  const prefs = user?.notificationPrefs ? JSON.parse(user.notificationPrefs) : {};
  if (prefs.paymentReminders === false) return;

  await sendNotification(
    userId,
    'Payment Reminder',
    `Rs. ${amount.toFixed(2)} payment from ${customerName} is overdue. Tap to view invoice.`,
    `/app/invoices/${invoiceId}`
  );
}

// ─── Helper: GST deadline ───
async function sendGSTDeadline(userId, deadline, daysLeft) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
  const prefs = user?.notificationPrefs ? JSON.parse(user.notificationPrefs) : {};
  if (prefs.gstDeadlines === false) return;

  await sendNotification(
    userId,
    'GST Filing Deadline',
    `${deadline} is due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. File your return to avoid penalties.`,
    '/app/gst-reports'
  );
}

module.exports = router;
module.exports.sendNotification = sendNotification;
module.exports.sendPaymentReminder = sendPaymentReminder;
module.exports.sendGSTDeadline = sendGSTDeadline;
