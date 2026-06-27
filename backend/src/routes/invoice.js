const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { calculateInvoiceTotals, formatCurrency } = require('../services/gst');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

function calculateNextRecurDate(interval) {
  const now = new Date();
  switch (interval) {
    case 'MONTHLY': return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    case 'QUARTERLY': return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    case 'YEARLY': return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    default: return null;
  }
}

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
  currency: z.string().optional(),
  exchangeRate: z.number().optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.string().optional(),
  noteType: z.string().optional(),
  originalInvoiceId: z.string().optional(),
});

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const { status, paymentStatus, from, to, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const safePage = Math.max(Number(page), 1);

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
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, total, page: safePage, limit: safeLimit });
  } catch (err) {
    logger.error('List invoices error:', err);
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
    logger.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices
router.post('/', async (req, res) => {
  try {
    const data = invoiceSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.plan === 'FREE') {
      const thisMonthCount = await prisma.invoice.count({
        where: { userId: req.userId, invoiceDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      });
      if (thisMonthCount >= 10) {
        return res.status(403).json({ error: 'Free plan limit reached (10 invoices/month).', code: 'PLAN_LIMIT', limit: 10, used: thisMonthCount });
      }
    }

    const prefix = user.invoicePrefix || 'INV';
    let invoice;
    for (let attempt = 0; attempt < 5; attempt++) {
      const lastInvoice = await prisma.invoice.findFirst({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      });

      let invoiceNumber;
      if (lastInvoice) {
        const num = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1;
        invoiceNumber = `${prefix}-${String(num).padStart(4, '0')}`;
      } else {
        invoiceNumber = `${prefix}-0001`;
      }

      let customer = null;
      if (data.customerId) {
        customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      }

      const customerName = data.customerName || customer?.name || 'Walk-in Customer';
      const customerGst = data.customerGst || customer?.gstNumber || null;
      const customerState = data.customerState || customer?.state || null;
      const customerAddress = data.customerAddress || customer?.address || null;

      const totals = calculateInvoiceTotals({
        items: data.items,
        supplierState: user.state,
        customerState: customerState,
        discount: data.discount,
        reverseCharge: data.reverseCharge,
      });

      try {
        invoice = await prisma.invoice.create({
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
            currency: data.currency || user.currency || 'INR',
            exchangeRate: data.exchangeRate || 1,
            isRecurring: data.isRecurring || false,
            recurringInterval: data.recurringInterval || null,
            nextRecurDate: data.isRecurring ? calculateNextRecurDate(data.recurringInterval) : null,
            noteType: data.noteType || null,
            originalInvoiceId: data.originalInvoiceId || null,
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
        break; // Success
      } catch (createErr) {
        if (createErr.code === 'P2002' && createErr.meta?.target?.includes('invoiceNumber')) {
          continue; // Duplicate invoice number, retry with next number
        }
        throw createErr;
      }
    }

    if (!invoice) {
      return res.status(500).json({ error: 'Failed to generate unique invoice number' });
    }

    res.status(201).json(invoice);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error('Create invoice error:', err);
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
    logger.error('Get invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id — Full invoice update
router.put('/:id', async (req, res) => {
  try {
    const data = invoiceSchema.parse(req.body);

    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    if (existing.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot edit a paid invoice' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    let customer = null;
    if (data.customerId) {
      customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    }

    const customerName = data.customerName || customer?.name || 'Walk-in Customer';
    const customerGst = data.customerGst || customer?.gstNumber || null;
    const customerState = data.customerState || customer?.state || null;
    const customerAddress = data.customerAddress || customer?.address || null;

    const totals = calculateInvoiceTotals({
      items: data.items,
      supplierState: user.state,
      customerState,
      discount: data.discount,
      reverseCharge: data.reverseCharge,
    });

    // Delete old items, create new ones
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });

    const invoice = await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        customerId: data.customerId || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : existing.invoiceDate,
        dueDate: data.dueDate ? new Date(data.dueDate) : existing.dueDate,
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
        notes: data.notes || existing.notes,
        terms: data.terms || existing.terms,
        placeOfSupply: data.placeOfSupply || customerState,
        reverseCharge: data.reverseCharge,
        isDraft: existing.status === 'DRAFT',
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

    res.json(invoice);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    logger.error('Update invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id/status
const validStatuses = ['DRAFT', 'SENT', 'PAID', 'CANCELLED', 'OVERDUE'];
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'PAID' && status !== 'PAID') {
      return res.status(400).json({ error: 'Cannot change status of a paid invoice' });
    }
    const updated = await prisma.invoice.update({
      where: { id: req.params.id, userId: req.userId },
      data: { status },
      include: { items: true },
    });
    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'Update status error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id/payment
router.put('/:id/payment', async (req, res) => {
  try {
    const { paymentMethod, paymentRef } = req.body;
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const updated = await prisma.invoice.update({
      where: { id: req.params.id, userId: req.userId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod || 'Other',
        paymentRef: paymentRef || null,
        paymentDate: new Date(),
        status: 'PAID',
      },
      include: { items: true },
    });
    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'Update payment error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await prisma.invoice.update({
      where: { id: req.params.id, userId: req.userId },
      data: { isCancelled: true, status: 'CANCELLED' },
    });
    res.json({ message: 'Invoice cancelled' });
  } catch (err) {
    logger.error({ err }, 'Delete invoice error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
