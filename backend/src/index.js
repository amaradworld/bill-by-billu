const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoice');
const customerRoutes = require('./routes/customer');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Bill By Billu',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Error handler ───
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ───
app.listen(PORT, () => {
  console.log(`[Bill By Billu] Server running on port ${PORT}`);
  console.log(`[Bill By Billu] Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
