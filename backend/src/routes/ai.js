const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { calculateInvoiceTotals } = require('../services/gst');
const {
  parseInvoiceCommand, parseWhatsAppMessage, parseOCRText,
  suggestProducts, queryBusinessData, generatePaymentReminder,
  classifyProduct, lookupHSN,
} = require('../services/ai');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

// ============================================================
// POST /api/ai/parse-invoice — Natural language → Invoice draft
// ============================================================
router.post('/parse-invoice', async (req, res) => {
  try {
    const { text, source } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    let parsed;
    if (source === 'whatsapp') {
      parsed = parseWhatsAppMessage(text);
    } else if (source === 'ocr') {
      parsed = parseOCRText(text);
    } else {
      parsed = parseInvoiceCommand(text);
    }

    // Try to match customers from DB
    let matchedCustomer = null;
    if (parsed.customerName) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          userId: req.userId,
          OR: [
            { name: { contains: parsed.customerName, mode: 'insensitive' } },
          ],
        },
      });
    }

    // Try to match products from DB for each item
    const matchedItems = await Promise.all(parsed.items.map(async (item) => {
      const existingProduct = await prisma.product.findFirst({
        where: {
          userId: req.userId,
          isActive: true,
          OR: [
            { name: { contains: item.name, mode: 'insensitive' } },
          ],
        },
      });

      if (existingProduct) {
        return {
          productId: existingProduct.id,
          name: existingProduct.name,
          description: existingProduct.description || '',
          hsnCode: existingProduct.hsnCode || item.hsnCode || '',
          unit: existingProduct.unit || 'NOS',
          quantity: item.quantity,
          unitPrice: item.unitPrice || Number(existingProduct.unitPrice),
          discount: 0,
          gstRate: Number(existingProduct.gstRate),
          matched: true,
        };
      }

      // No match — use AI HSN/GST classification
      return {
        productId: null,
        name: item.name,
        description: '',
        hsnCode: item.hsnCode || '',
        unit: item.unit || 'NOS',
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        discount: 0,
        gstRate: item.gstRate || 18,
        matched: false,
      };
    }));

    res.json({
      customer: matchedCustomer ? {
        id: matchedCustomer.id,
        name: matchedCustomer.name,
        gstNumber: matchedCustomer.gstNumber,
        state: matchedCustomer.state,
        address: matchedCustomer.address,
      } : parsed.customerName ? { name: parsed.customerName } : null,
      items: matchedItems,
      source: source || 'text',
    });
  } catch (err) {
    logger.error('AI parse invoice error:', err);
    res.status(500).json({ error: 'Failed to parse invoice' });
  }
});

// ============================================================
// POST /api/ai/create-invoice — Create invoice from parsed data
// ============================================================
router.post('/create-invoice', async (req, res) => {
  try {
    const { customerId, customerName, customerGst, customerAddress, customerState, items, notes, terms } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check free plan limit
    if (user.plan === 'FREE') {
      const thisMonthCount = await prisma.invoice.count({
        where: { userId: req.userId, invoiceDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      });
      if (thisMonthCount >= 10) {
        return res.status(403).json({ error: 'Free plan limit reached (10 invoices/month).' });
      }
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });
    const prefix = user.invoicePrefix || 'INV';
    let invoiceNumber;
    if (lastInvoice) {
      const num = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1;
      invoiceNumber = `${prefix}-${String(num).padStart(4, '0')}`;
    } else {
      invoiceNumber = `${prefix}-0001`;
    }

    // Resolve customer
    let custName = customerName || 'Walk-in Customer';
    let custGst = customerGst || null;
    let custState = customerState || null;
    let custAddress = customerAddress || null;

    if (customerId) {
      const cust = await prisma.customer.findUnique({ where: { id: customerId } });
      if (cust) {
        custName = cust.name;
        custGst = cust.gstNumber;
        custState = cust.state;
        custAddress = cust.address;
      }
    }

    const totals = calculateInvoiceTotals({
      items,
      supplierState: user.state,
      customerState: custState,
      discount: 0,
      reverseCharge: false,
    });

    const invoice = await prisma.invoice.create({
      data: {
        userId: req.userId,
        customerId: customerId || null,
        invoiceNumber,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'DRAFT',
        supplierName: user.businessName || user.name,
        supplierGst: user.gstNumber,
        supplierAddress: [user.address, user.city, user.state, user.pincode].filter(Boolean).join(', '),
        supplierState: user.state,
        customerName: custName,
        customerGst: custGst,
        customerAddress: custAddress,
        customerState: custState,
        subtotal: totals.subtotal,
        discountAmount: 0,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        totalTax: totals.totalTax,
        totalAmount: totals.totalAmount,
        paymentStatus: 'UNPAID',
        notes: notes || 'Thank you for your business!',
        terms: terms || 'Payment due within 30 days',
        placeOfSupply: custState,
        reverseCharge: false,
        currency: 'INR',
        exchangeRate: 1,
        isDraft: true,
        items: {
          create: items.map((item, idx) => ({
            productId: item.productId || null,
            name: item.name,
            description: item.description || null,
            hsnCode: item.hsnCode || null,
            unit: item.unit || 'NOS',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            gstRate: item.gstRate || 18,
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
    logger.error('AI create invoice error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// ============================================================
// POST /api/ai/suggest-products — Product suggestions
// ============================================================
router.post('/suggest-products', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const suggestions = suggestProducts(description);

    // Try to match with existing products
    const matchedProducts = await Promise.all(suggestions.map(async (name) => {
      const product = await prisma.product.findFirst({
        where: { userId: req.userId, isActive: true, name: { contains: name, mode: 'insensitive' } },
      });
      return {
        name,
        existing: product ? { id: product.id, name: product.name, price: Number(product.unitPrice) } : null,
        hsn: lookupHSN(name),
      };
    }));

    res.json({ suggestions: matchedProducts });
  } catch (err) {
    logger.error('AI suggest products error:', err);
    res.status(500).json({ error: 'Failed to suggest products' });
  }
});

// ============================================================
// POST /api/ai/classify-product — Auto HSN/GST classification
// ============================================================
router.post('/classify-product', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const classification = classifyProduct(name);
    res.json(classification);
  } catch (err) {
    logger.error('AI classify product error:', err);
    res.status(500).json({ error: 'Failed to classify product' });
  }
});

// ============================================================
// POST /api/ai/query — Natural language business queries
// ============================================================
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await queryBusinessData(req.userId, query);
    res.json(result);
  } catch (err) {
    logger.error('AI query error:', err);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// ============================================================
// POST /api/ai/reminders — Generate payment reminders
// ============================================================
router.post('/reminders', async (req, res) => {
  try {
    const { invoiceId } = req.body;

    let invoices;
    if (invoiceId) {
      const inv = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId: req.userId, paymentStatus: 'UNPAID', isCancelled: false },
        include: { customer: { select: { name: true, phone: true } } },
      });
      if (!inv) return res.status(404).json({ error: 'Unpaid invoice not found' });
      invoices = [inv];
    } else {
      invoices = await prisma.invoice.findMany({
        where: { userId: req.userId, paymentStatus: 'UNPAID', isCancelled: false },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { invoiceDate: 'asc' },
        take: 20,
      });
    }

    if (invoices.length === 0) {
      return res.json({ reminders: [], message: 'No unpaid invoices found' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const reminders = invoices.map(inv => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName || inv.customer?.name || 'Walk-in',
      customerPhone: inv.customer?.phone || null,
      amount: Number(inv.totalAmount),
      message: generatePaymentReminder(inv, user),
    }));

    res.json({ reminders });
  } catch (err) {
    logger.error('AI reminders error:', err);
    res.status(500).json({ error: 'Failed to generate reminders' });
  }
});

// ============================================================
// POST /api/ai/whatsapp-parse — Parse WhatsApp message
// ============================================================
router.post('/whatsapp-parse', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const parsed = parseWhatsAppMessage(message);

    // Match customers
    let matchedCustomer = null;
    if (parsed.customerName) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          userId: req.userId,
          OR: [{ name: { contains: parsed.customerName, mode: 'insensitive' } }],
        },
      });
    }

    // Match products
    const matchedItems = await Promise.all(parsed.items.map(async (item) => {
      const existingProduct = await prisma.product.findFirst({
        where: {
          userId: req.userId,
          isActive: true,
          OR: [{ name: { contains: item.name, mode: 'insensitive' } }],
        },
      });

      return {
        productId: existingProduct?.id || null,
        name: existingProduct?.name || item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || (existingProduct ? Number(existingProduct.unitPrice) : 0),
        gstRate: existingProduct ? Number(existingProduct.gstRate) : (item.gstRate || 18),
        matched: !!existingProduct,
      };
    }));

    res.json({
      parsed: true,
      customer: matchedCustomer ? { id: matchedCustomer.id, name: matchedCustomer.name } : (parsed.customerName ? { name: parsed.customerName } : null),
      items: matchedItems,
    });
  } catch (err) {
    logger.error('WhatsApp parse error:', err);
    res.status(500).json({ error: 'Failed to parse message' });
  }
});

module.exports = router;
