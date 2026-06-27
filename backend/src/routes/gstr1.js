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
      const sanitize = (val) => {
        const s = String(val || '');
        return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      };
      const csvRows = ['Invoice Number,Date,Customer,GSTIN,Subtotal,CGST,SGST,IGST,Total'];
      invoices.forEach(inv => {
        csvRows.push([
          inv.invoiceNumber,
          inv.invoiceDate.toISOString().split('T')[0],
          `"${sanitize(inv.customerName)}"`,
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

// GET /api/gstr1/gstr3b?period=2026-06
router.get('/gstr3b', async (req, res) => {
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
    });

    const expenses = await prisma.expense.findMany({
      where: {
        userId: req.userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    // 3.1 Outward supplies
    let taxableOutward = 0, cgstPayable = 0, sgstPayable = 0, igstPayable = 0;
    let zeroRated = 0, exempt = 0, nilRated = 0, nonGst = 0;

    invoices.forEach(inv => {
      const taxable = Number(inv.subtotal) - Number(inv.discountAmount);
      const cgst = Number(inv.cgst);
      const sgst = Number(inv.sgst);
      const igst = Number(inv.igst);

      taxableOutward += taxable;
      cgstPayable += cgst;
      sgstPayable += sgst;
      igstPayable += igst;
    });

    // 4 ITC (Input Tax Credit from expenses)
    let itcCgst = 0, itcSgst = 0, itcIgst = 0;
    expenses.forEach(exp => {
      if (exp.isDeductible) {
        const gstAmount = Number(exp.gstAmount || 0);
        const rate = Number(exp.gstRate || 0);
        if (rate > 0) {
          // Assume intra-state for simplicity
          itcCgst += gstAmount / 2;
          itcSgst += gstAmount / 2;
        }
      }
    });

    const totalTaxPayable = (cgstPayable + sgstPayable + igstPayable) - (itcCgst + itcSgst + itcIgst);

    const gstr3b = {
      gstin: user?.gstNumber || '',
      period,
      supplierName: user?.businessName || user?.name || '',
      // 3.1 Outward supplies
      outwardSupplies: {
        taxableOutward: Math.round(taxableOutward * 100) / 100,
        zeroRated: Math.round(zeroRated * 100) / 100,
        exempt: Math.round(exempt * 100) / 100,
        nilRated: Math.round(nilRated * 100) / 100,
        nonGst: Math.round(nonGst * 100) / 100,
        totalTaxable: Math.round(taxableOutward * 100) / 100,
      },
      // 3.2 Tax payable
      taxPayable: {
        cgst: Math.round(cgstPayable * 100) / 100,
        sgst: Math.round(sgstPayable * 100) / 100,
        igst: Math.round(igstPayable * 100) / 100,
        total: Math.round((cgstPayable + sgstPayable + igstPayable) * 100) / 100,
      },
      // 4 ITC
      itc: {
        cgst: Math.round(itcCgst * 100) / 100,
        sgst: Math.round(itcSgst * 100) / 100,
        igst: Math.round(itcIgst * 100) / 100,
        total: Math.round((itcCgst + itcSgst + itcIgst) * 100) / 100,
      },
      // 5 Net tax payable
      netTaxPayable: Math.round(totalTaxPayable * 100) / 100,
      totalInvoices: invoices.length,
      totalExpenses: expenses.length,
    };

    res.json(gstr3b);
  } catch (err) {
    logger.error({ err }, 'GSTR-3B generation failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
