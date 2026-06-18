const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { calculateInvoiceTotals, formatCurrency } = require('../services/gst');

const router = express.Router();
router.use(authenticate);

const itemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  unit: z.string().default('NOS'),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).default(0),
  gstRate: z.number().min(0).max(28),
});

const invoiceSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerGst: z.string().optional(),
  customerAddress: z.string().optional(),
  customerState: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(itemSchema).min(1),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().default(false),
  paymentMethod: z.string().optional(),
});

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const { status, paymentStatus, from, to, page = 1, limit = 50 } = req.query;

    const where = { userId: req.userId, isCancelled: false };
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (from || to) {
      where.invoiceDate = {};
      if (from) where.invoiceDate.gte = new Date(from);
      if (to) where.invoiceDate.lte = new Date(to);
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { items: true, customer: { select: { id: true, name: true, gstNumber: true } } },
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('List invoices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthData, lastMonthData, totalUnpaid, recentInvoices] = await Promise.all([
      prisma.invoice.aggregate({
        where: { userId: req.userId, invoiceDate: { gte: thisMonth }, isCancelled: false },
        _sum: { totalAmount: true, totalTax: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: { userId: req.userId, invoiceDate: { gte: lastMonth, lt: thisMonth }, isCancelled: false },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: { userId: req.userId, paymentStatus: 'UNPAID', isCancelled: false },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.findMany({
        where: { userId: req.userId, isCancelled: false },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const revenue = Number(thisMonthData._sum.totalAmount || 0);
    const lastRevenue = Number(lastMonthData._sum.totalAmount || 0);
    const revenueChange = lastRevenue > 0 ? ((revenue - lastRevenue) / lastRevenue * 100).toFixed(1) : 0;

    res.json({
      thisMonth: {
        revenue,
        tax: Number(thisMonthData._sum.totalTax || 0),
        invoiceCount: thisMonthData._count,
      },
      lastMonth: {
        revenue: lastRevenue,
        invoiceCount: lastMonthData._count,
        revenueChange: Number(revenueChange),
      },
      unpaid: {
        amount: Number(totalUnpaid._sum.totalAmount || 0),
        count: totalUnpaid._count,
      },
      recentInvoices: recentInvoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName || inv.customer?.name || 'Walk-in',
        totalAmount: Number(inv.totalAmount),
        status: inv.status,
        paymentStatus: inv.paymentStatus,
        invoiceDate: inv.invoiceDate,
      })),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices
router.post('/', async (req, res) => {
  try {
    const data = invoiceSchema.parse(req.body);

    // Get user's business info
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check invoice limit for FREE plan
    if (user.plan === 'FREE') {
      const thisMonthCount = await prisma.invoice.count({
        where: { userId: req.userId, invoiceDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      });
      if (thisMonthCount >= 10) {
        return res.status(403).json({ error: 'Free plan limit reached (10 invoices/month). Upgrade to Starter for unlimited.' });
      }
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    let invoiceNumber;
    if (lastInvoice) {
      const num = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1;
      invoiceNumber = `INV-${String(num).padStart(4, '0')}`;
    } else {
      invoiceNumber = 'INV-0001';
    }

    // Resolve customer
    let customer = null;
    if (data.customerId) {
      customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    }

    const customerName = data.customerName || customer?.name || 'Walk-in Customer';
    const customerGst = data.customerGst || customer?.gstNumber || null;
    const customerState = data.customerState || customer?.state || null;
    const customerAddress = data.customerAddress || customer?.address || null;

    // Calculate GST
    const totals = calculateInvoiceTotals({
      items: data.items,
      supplierState: user.state,
      customerState: customerState,
      discount: data.discount,
      reverseCharge: data.reverseCharge,
    });

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        userId: req.userId,
        customerId: data.customerId || null,
        invoiceNumber,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: 'DRAFT',
        supplierName: user.businessName || user.name,
        supplierGst: user.gstNumber,
        supplierAddress: [user.address, user.city, user.state, user.pincode].filter(Boolean).join(', '),
        supplierState: user.state,
        customerName,
        customerGst,
        customerAddress,
        customerState,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        totalTax: totals.totalTax,
        totalAmount: totals.totalAmount,
        paymentStatus: 'UNPAID',
        notes: data.notes || 'Thank you for your business!',
        terms: data.terms || 'Payment due within 30 days',
        placeOfSupply: data.placeOfSupply || customerState,
        reverseCharge: data.reverseCharge,
        isDraft: true,
        items: {
          create: data.items.map((item, idx) => ({
            productId: item.productId || null,
            name: item.name,
            description: item.description || null,
            hsnCode: item.hsnCode || null,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            gstRate: item.gstRate,
            cgst: totals.items[idx]?.cgst || 0,
            sgst: totals.items[idx]?.sgst || 0,
            igst: totals.items[idx]?.igst || 0,
            totalAmount: totals.items[idx]?.totalAmount || 0,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    res.status(201).json(invoice);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { items: true, customer: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    console.error('Get invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: true },
    });
    res.json(invoice);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id/payment
router.put('/:id/payment', async (req, res) => {
  try {
    const { paymentMethod, paymentRef } = req.body;
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        paymentStatus: 'PAID',
        paymentMethod,
        paymentRef,
        paymentDate: new Date(),
        status: 'PAID',
      },
      include: { items: true },
    });
    res.json(invoice);
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { isCancelled: true, status: 'CANCELLED' },
    });
    res.json({ message: 'Invoice cancelled' });
  } catch (err) {
    console.error('Delete invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
