const express = require('express');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { generateInvoicePDF } = require('./pdf');
const { calculateInvoiceTotals } = require('../services/gst');
const logger = require('../logger');

const router = express.Router();

// ─── Webhook verification (GET) ───
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ─── Message parser ───
function parseInvoiceMessage(text) {
  const lower = text.toLowerCase().trim();

  // Patterns to match invoice creation requests
  const patterns = [
    // "create invoice for Rahul for 2 shirts at 500 each"
    /(?:create|make|new|add|raise)\s+(?:an?\s+)?(?:invoice|bill|receipt)\s+(?:for|to)\s+(.+?)(?:\s+(?:for|with)\s+(.+))?$/i,
    // "invoice for Rahul for 2 shirts at 500 each"
    /(?:invoice|bill|receipt)\s+(?:for|to)\s+(.+?)(?:\s+(?:for|with)\s+(.+))?$/i,
    // "bill to Rahul 2 shirts at 500"
    /(?:bill\s+to|charge)\s+(.+?)(?:\s+(?:for|with)\s+(.+))?$/i,
  ];

  let customerName = null;
  let itemsText = null;

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
      customerName = match[1]?.trim();
      itemsText = match[2]?.trim();
      break;
    }
  }

  if (!customerName) return null;

  // Clean up customer name (remove trailing prepositions)
  customerName = customerName.replace(/\s+(for|with|at|rs|inr|\d).*$/i, '').trim();
  // Capitalize first letter of each word
  customerName = customerName.replace(/\b\w/g, c => c.toUpperCase());

  // Parse items
  const items = [];
  if (itemsText) {
    // Pattern: "2 shirts at 500 each" or "shirt at 500" or "shirts at 500 each"
    const itemPatterns = [
      /(\d+)\s+(.+?)\s+(?:at|@)\s+(?:rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/gi,
      /(.+?)\s+(?:at|@)\s+(?:rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/gi,
    ];

    let matched = false;
    for (const ip of itemPatterns) {
      let itemMatch;
      while ((itemMatch = ip.exec(itemsText)) !== null) {
        matched = true;
        if (itemMatch[3]) {
          // Pattern with qty
          items.push({
            name: itemMatch[2].trim().replace(/\b\w/g, c => c.toUpperCase()),
            quantity: parseInt(itemMatch[1]),
            unitPrice: parseFloat(itemMatch[3]),
          });
        } else if (itemMatch[2]) {
          // Pattern without qty
          items.push({
            name: itemMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase()),
            quantity: 1,
            unitPrice: parseFloat(itemMatch[2]),
          });
        }
      }
      if (matched) break;
    }

    // Fallback: if no items matched, try simple "item at price"
    if (items.length === 0) {
      const simpleMatch = itemsText.match(/(.+?)\s+(?:at|@)\s+(?:rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i);
      if (simpleMatch) {
        items.push({
          name: simpleMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase()),
          quantity: 1,
          unitPrice: parseFloat(simpleMatch[2]),
        });
      }
    }
  }

  // If no items parsed, create a single generic item from amount in message
  if (items.length === 0) {
    const amountMatch = lower.match(/(?:rs\.?|inr|₹)\s*(\d+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      items.push({
        name: 'Service',
        quantity: 1,
        unitPrice: parseFloat(amountMatch[1]),
      });
    }
  }

  if (items.length === 0) return null;

  return { customerName, items };
}

// ─── Send WhatsApp message via Cloud API ───
async function sendWhatsAppMessage(phoneNumber, message) {
  const apiToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiToken || !phoneNumberId) {
    throw new Error('WhatsApp API credentials not configured');
  }

  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: message },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to send WhatsApp message');
  }
  return data;
}

// ─── Send PDF via WhatsApp ───
async function sendWhatsAppPDF(phoneNumber, pdfBuffer, filename, caption) {
  const apiToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiToken || !phoneNumberId) {
    throw new Error('WhatsApp API credentials not configured');
  }

  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  const base64Pdf = pdfBuffer.toString('base64');

  // Upload media
  const uploadRes = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        type: 'document',
        document: {
          filename,
          mime_type: 'application/pdf',
          data: base64Pdf,
        },
      }),
    }
  );

  const uploadData = await uploadRes.json();
  if (!uploadData.id) {
    throw new Error('Failed to upload media to WhatsApp');
  }

  // Send document
  const messageRes = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'document',
        document: {
          id: uploadData.id,
          caption: caption || '',
        },
      }),
    }
  );

  const messageData = await messageRes.json();
  if (!messageData.messages) {
    throw new Error(messageData.error?.message || 'Failed to send PDF via WhatsApp');
  }
  return messageData;
}

// ─── Process inbound WhatsApp message ───
async function processInboundMessage(userId, phoneNumber, messageText) {
  // Log inbound message
  await prisma.whatsappLog.create({
    data: {
      userId,
      phoneNumber,
      direction: 'inbound',
      message: messageText,
    },
  });

  const parsed = parseInvoiceMessage(messageText);
  if (!parsed) {
    return {
      reply: "I couldn't understand your request. Try:\n\n• *Create invoice for [customer] for [item] at [price]*\n• *Bill to [customer] [qty] [item] at [price]*\n\nExample: \"Create invoice for Rahul for 2 shirts at 500 each\"",
    };
  }

  // Find or create customer
  let customer = await prisma.customer.findFirst({
    where: { userId, name: { contains: parsed.customerName, mode: 'insensitive' } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        userId,
        name: parsed.customerName,
        type: 'B2C',
      },
    });
  }

  // Get user for GST calculation
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const defaultGstRate = 18;

  // Build items with GST
  const items = parsed.items.map(item => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unit: 'NOS',
    discount: 0,
    gstRate: defaultGstRate,
  }));

  const totals = calculateInvoiceTotals({
    items,
    supplierState: user.state,
    customerState: customer.state,
    discount: 0,
    reverseCharge: false,
  });

  // Generate invoice number
  const prefix = user.invoicePrefix || 'INV';
  let invoiceNumber;
  const lastInvoice = await prisma.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  if (lastInvoice) {
    const num = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1;
    invoiceNumber = `${prefix}-${String(num).padStart(4, '0')}`;
  } else {
    invoiceNumber = `${prefix}-0001`;
  }

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      userId,
      customerId: customer.id,
      invoiceNumber,
      invoiceDate: new Date(),
      status: 'SENT',
      supplierName: user.businessName || user.name,
      supplierGst: user.gstNumber,
      supplierAddress: [user.address, user.city, user.state, user.pincode].filter(Boolean).join(', '),
      supplierState: user.state,
      customerName: customer.name,
      customerGst: customer.gstNumber,
      customerAddress: customer.address,
      customerState: customer.state,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      totalTax: totals.totalTax,
      totalAmount: totals.totalAmount,
      paymentStatus: 'UNPAID',
      notes: 'Thank you for your business!',
      terms: 'Payment due within 30 days',
      placeOfSupply: customer.state,
      isDraft: false,
      items: {
        create: items.map((item, idx) => ({
          name: item.name,
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

  // Generate PDF
  const pdfBuffer = await generateInvoicePDF(invoice, user);

  // Send PDF via WhatsApp
  try {
    const caption = `Invoice ${invoice.invoiceNumber}\nTotal: ₹${Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nCustomer: ${customer.name}`;
    await sendWhatsAppPDF(phoneNumber, pdfBuffer, `${invoice.invoiceNumber}.pdf`, caption);

    // Log outbound
    await prisma.whatsappLog.create({
      data: {
        userId,
        phoneNumber,
        direction: 'outbound',
        message: `Invoice ${invoice.invoiceNumber} sent — Total: ₹${Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        invoiceId: invoice.id,
        status: 'sent',
      },
    });
  } catch (sendErr) {
    logger.warn({ err: sendErr }, 'Failed to send invoice PDF via WhatsApp');
    await prisma.whatsappLog.create({
      data: {
        userId,
        phoneNumber,
        direction: 'outbound',
        message: `Failed to send invoice PDF: ${sendErr.message}`,
        invoiceId: invoice.id,
        status: 'failed',
      },
    });
  }

  const itemList = parsed.items
    .map(i => `• ${i.quantity}x ${i.name} @ ₹${i.unitPrice}`)
    .join('\n');

  return {
    reply: `✅ Invoice *${invoice.invoiceNumber}* created!\n\n📋 Items:\n${itemList}\n\n💰 Total: *₹${Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n👤 Customer: ${customer.name}\n\nPDF sent! Thank you.`,
    invoice,
  };
}

// ─── POST /webhook — receive inbound messages ───
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // WhatsApp Cloud API webhook format
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.length) {
        // Status update or other event
        return res.sendStatus(200);
      }

      const message = value.messages[0];
      const phoneNumber = message.from;
      const messageText = message.text?.body;

      if (!messageText) {
        return res.sendStatus(200);
      }

      // Find user by phone number (the business phone number receiving the message)
      // In a multi-user setup, you'd map phone numbers to users
      // For now, find the first user with WhatsApp bot enabled
      const users = await prisma.user.findMany({
        where: {
          whatsappNumber: { not: null },
        },
      });

      // Try to find a matching user by the recipient phone number
      const recipientPhone = value.metadata?.display_phone_number;
      const user = users.find(u => {
        const userPhone = u.whatsappNumber?.replace(/[^0-9]/g, '');
        const recipient = recipientPhone?.replace(/[^0-9]/g, '');
        return userPhone && recipient && userPhone.endsWith(recipient.slice(-10));
      }) || users[0];

      if (!user) {
        logger.warn('No user found for WhatsApp bot message');
        return res.sendStatus(200);
      }

      const result = await processInboundMessage(user.id, phoneNumber, messageText);

      // Send reply
      try {
        await sendWhatsAppMessage(phoneNumber, result.reply);
      } catch (replyErr) {
        logger.warn({ err: replyErr }, 'Failed to send WhatsApp reply');
      }
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, 'WhatsApp webhook error');
    res.sendStatus(200); // Always return 200 for webhooks
  }
});

// ─── POST /send — manually send invoice via WhatsApp ───
router.post('/send', authenticate, async (req, res) => {
  try {
    const { invoiceId, phoneNumber } = req.body;

    if (!invoiceId || !phoneNumber) {
      return res.status(400).json({ error: 'invoiceId and phoneNumber are required' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: req.userId },
      include: { items: true, customer: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const pdfBuffer = await generateInvoicePDF(invoice, user);

    const caption = `Invoice ${invoice.invoiceNumber}\nTotal: ₹${Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nCustomer: ${invoice.customerName || invoice.customer?.name || 'Walk-in'}`;

    await sendWhatsAppPDF(phoneNumber, pdfBuffer, `${invoice.invoiceNumber}.pdf`, caption);

    // Log outbound
    await prisma.whatsappLog.create({
      data: {
        userId: req.userId,
        phoneNumber,
        direction: 'outbound',
        message: `Invoice ${invoice.invoiceNumber} sent — Total: ₹${Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        invoiceId: invoice.id,
        status: 'sent',
      },
    });

    res.json({ success: true, message: 'Invoice sent via WhatsApp' });
  } catch (err) {
    logger.error({ err }, 'WhatsApp send error');
    res.status(500).json({ error: err.message || 'Failed to send via WhatsApp' });
  }
});

// ─── GET /logs — get WhatsApp conversation logs ───
router.get('/logs', authenticate, async (req, res) => {
  try {
    const { phoneNumber, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const safePage = Math.max(Number(page), 1);

    const where = { userId: req.userId };
    if (phoneNumber) where.phoneNumber = phoneNumber;

    const [logs, total] = await Promise.all([
      prisma.whatsappLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.whatsappLog.count({ where }),
    ]);

    res.json({ logs, total, page: safePage, limit: safeLimit });
  } catch (err) {
    logger.error({ err }, 'WhatsApp logs error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /conversations — get unique conversations ───
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const logs = await prisma.whatsappLog.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      distinct: ['phoneNumber'],
      select: {
        phoneNumber: true,
        createdAt: true,
        message: true,
        direction: true,
      },
    });

    // Group by phone number, get latest message
    const conversations = {};
    for (const log of logs) {
      if (!conversations[log.phoneNumber]) {
        conversations[log.phoneNumber] = {
          phoneNumber: log.phoneNumber,
          lastMessage: log.message,
          lastDirection: log.direction,
          lastAt: log.createdAt,
        };
      }
    }

    res.json({ conversations: Object.values(conversations) });
  } catch (err) {
    logger.error({ err }, 'WhatsApp conversations error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /test — send test message ───
router.post('/test', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    const testMessage = message || 'Test message from Bill By Billu WhatsApp Bot. If you received this, your webhook is configured correctly!';

    await sendWhatsAppMessage(phoneNumber, testMessage);

    // Log
    await prisma.whatsappLog.create({
      data: {
        userId: req.userId,
        phoneNumber,
        direction: 'outbound',
        message: testMessage,
        status: 'sent',
      },
    });

    res.json({ success: true, message: 'Test message sent' });
  } catch (err) {
    logger.error({ err }, 'WhatsApp test message error');
    res.status(500).json({ error: err.message || 'Failed to send test message' });
  }
});

// ─── GET /config — get bot configuration ───
router.get('/config', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    res.json({
      webhookUrl: `${process.env.BACKEND_URL || 'https://bill-by-billu.onrender.com'}/api/whatsapp-bot/webhook`,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'Not configured',
      apiConfigured: !!(process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_API_KEY),
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'Not configured',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'Not configured',
      whatsappNumber: user?.whatsappNumber || null,
    });
  } catch (err) {
    logger.error({ err }, 'WhatsApp config error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
