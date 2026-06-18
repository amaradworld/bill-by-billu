const express = require('express');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

// GET /api/gstr1?period=2026-06
router.get('/', async (req, res) => {
  try {
    const { period } = req.query;
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Period required (YYYY-MM)' });
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const invoices = await prisma.invoice.findMany({
      where: {
        userId: req.userId,
        invoiceDate: { gte: startDate, lte: endDate },
        isCancelled: false,
      },
      include: { items: true },
      orderBy: { invoiceDate: 'asc' },
    });

    // Build GSTR-1 B2B section
    const b2b = [];
    const b2c = [];
    let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

    invoices.forEach(inv => {
      const entry = {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString().split('T')[0],
        invoiceValue: Number(inv.totalAmount),
        placeOfSupply: inv.placeOfSupply || '',
        reverseCharge: inv.reverseCharge ? 'Y' : 'N',
        items: inv.items.map(item => ({
          name: item.name,
          hsnCode: item.hsnCode || '',
          taxableValue: Number(item.totalAmount) - Number(item.igst) - Number(item.cgst) - Number(item.sgst),
          cgst: Number(item.cgst),
          sgst: Number(item.sgst),
          igst: Number(item.igst),
          rate: Number(item.gstRate),
        })),
        totalTaxable: Number(inv.subtotal) - Number(inv.discountAmount),
        cgst: Number(inv.cgst),
        sgst: Number(inv.sgst),
        igst: Number(inv.igst),
      };

      totalTaxable += entry.totalTaxable;
      totalCgst += entry.cgst;
      totalSgst += entry.sgst;
      totalIgst += entry.igst;

      if (inv.customerGst) {
        entry.gstin = inv.customerGst;
        entry.customerName = inv.customerName;
        b2b.push(entry);
      } else {
        b2c.push(entry);
      }
    });

    const gstr1 = {
      gstin: (await prisma.user.findUnique({ where: { id: req.userId } }))?.gstNumber || '',
      period,
      summary: {
        totalInvoices: invoices.length,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        totalTax: Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100,
      },
      b2b,
      b2c,
    };

    res.json(gstr1);
  } catch (err) {
    logger.error({ err }, 'GSTR-1 generation failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/gstr1/export?period=2026-06&format=json
router.get('/export', async (req, res) => {
  try {
    const { period, format = 'json' } = req.query;
    if (!period) return res.status(400).json({ error: 'Period required' });

    // Reuse the GSTR-1 generation logic
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const invoices = await prisma.invoice.findMany({
      where: {
        userId: req.userId,
        invoiceDate: { gte: startDate, lte: endDate },
        isCancelled: false,
      },
      include: { items: true },
      orderBy: { invoiceDate: 'asc' },
    });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (format === 'csv') {
      const csvRows = ['Invoice Number,Date,Customer,GSTIN,Subtotal,CGST,SGST,IGST,Total'];
      invoices.forEach(inv => {
        csvRows.push([
          inv.invoiceNumber,
          inv.invoiceDate.toISOString().split('T')[0],
          `"${inv.customerName || ''}"`,
          inv.customerGst || '',
          Number(inv.subtotal) - Number(inv.discountAmount),
          Number(inv.cgst), Number(inv.sgst), Number(inv.igst), Number(inv.totalAmount),
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="gstr1-${period}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="gstr1-${period}.json"`);
      res.json({ gstin: user?.gstNumber, period, invoices });
    }
  } catch (err) {
    logger.error({ err }, 'GSTR-1 export failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
