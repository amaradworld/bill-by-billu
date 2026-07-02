const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const prisma = require('./prisma');
const logger = require('./logger');

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoice');
const customerRoutes = require('./routes/customer');
const productRoutes = require('./routes/product');
const expenseRoutes = require('./routes/expense');
const gstr1Routes = require('./routes/gstr1');
const { generateInvoicePDF, router: pdfRoutes } = require('./routes/pdf');
const { router: paymentRoutes, webhookRouter } = require('./routes/payment');
const whatsappRoutes = require('./routes/whatsapp');
const aiRoutes = require('./routes/ai');
const subscriptionRoutes = require('./routes/subscription');
const adminRoutes = require('./routes/admin');
const subscriberRoutes = require('./routes/subscribers');
const inventoryRoutes = require('./routes/inventory');
const notificationRoutes = require('./routes/notifications');
const blogRoutes = require('./routes/blog');
const whatsappBotRoutes = require('./routes/whatsappBot');
const importRoutes = require('./routes/import');
const swaggerSpec = require('./swagger');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  logger.fatal('JWT_SECRET environment variable is required in production');
  process.exit(1);
}

// ─── Middleware ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: [
    ...(process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || []),
    'https://www.billbybillu.in',
    'https://billbybillu.in',
    'https://bill-by-billu.vercel.app',
    'capacitor://localhost',
    'https://localhost',
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000'] : []),
  ],
  credentials: true,
}));

// Razorpay webhook (must be before JSON parser — uses raw body)
app.use('/api', webhookRouter);

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
  skip: (req) => req.url === '/api/health',
});
app.use('/api/', limiter);

// ─── Health check (before auth routes) ───
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      app: 'Bill By Billu',
      version: '1.0.0',
      db: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    logger.error({ err }, 'Health check failed');
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/gstr1', gstr1Routes);
app.use('/api/invoices', pdfRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', whatsappRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/whatsapp-bot', whatsappBotRoutes);
app.use('/api/import', importRoutes);

// Swagger docs
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// ─── Request logging ───
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url !== '/api/health') {
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userId: req.userId || '-',
      });
    }
  });
  next();
});

// ─── 404 handler ───
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ─── Error handler ───
app.use((err, req, res, _next) => {
  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ───
const { sendPaymentReminder, sendGSTDeadline } = require('./routes/notifications');

app.listen(PORT, () => {
  logger.info(`[Bill By Billu] Server running on port ${PORT}`);
  logger.info(`[Bill By Billu] Health: http://localhost:${PORT}/api/health`);

  // ─── Scheduled notification jobs ───
  // Payment reminders: daily at 9 AM IST
  setInterval(async () => {
    try {
      const now = new Date();
      const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      if (ist.getHours() !== 9 || ist.getMinutes() !== 0) return;

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const unpaidInvoices = await prisma.invoice.findMany({
        where: { paymentStatus: 'UNPAID', invoiceDate: { lt: sevenDaysAgo } },
        include: { user: true, customer: true },
      });

      for (const inv of unpaidInvoices) {
        await sendPaymentReminder(
          inv.userId,
          inv.customer?.name || 'Customer',
          inv.grandTotal,
          inv.id
        );
      }
    } catch (err) {
      logger.error({ err }, 'Payment reminder job failed');
    }
  }, 60 * 1000);

  // GST deadline reminders: check daily at 9 AM IST
  setInterval(async () => {
    try {
      const now = new Date();
      const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      if (ist.getHours() !== 9 || ist.getMinutes() !== 0) return;

      const day = ist.getDate();
      let deadline = null;
      let daysLeft = 0;

      if (day === 28) { deadline = 'GSTR-1 (11th of next month)'; daysLeft = 13; }
      else if (day === 8) { deadline = 'GSTR-1 (11th)'; daysLeft = 3; }
      else if (day === 17) { deadline = 'GSTR-3B (20th)'; daysLeft = 3; }
      else if (day === 19) { deadline = 'GSTR-3B (20th tomorrow!)'; daysLeft = 1; }

      if (!deadline) return;

      const users = await prisma.user.findMany({ where: { plan: { not: 'FREE' } } });
      for (const user of users) {
        await sendGSTDeadline(user.id, deadline, daysLeft);
      }
    } catch (err) {
      logger.error({ err }, 'GST deadline job failed');
    }
  }, 60 * 1000);

  // ─── GST Blog Bot: every 8 hours ───
  const { processArticles: runBlogBot } = require('./services/blogBot');
  const EIGHT_HOURS = 8 * 60 * 60 * 1000;

  // Run once on startup (after 30s delay to let server stabilize)
  setTimeout(async () => {
    try {
      const posted = await runBlogBot();
      logger.info({ posted }, 'GST Blog Bot: initial run complete');
    } catch (err) {
      logger.error({ err }, 'GST Blog Bot: initial run failed');
    }
  }, 30000);

  // Then every 8 hours
  setInterval(async () => {
    try {
      await runBlogBot();
    } catch (err) {
      logger.error({ err }, 'GST Blog Bot: scheduled run failed');
    }
  }, EIGHT_HOURS);
});

module.exports = app;
