const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { generateInvoicePDF } = require('./pdf');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

const sendWhatsAppSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
});

// POST /api/invoices/:id/whatsapp-send
router.post('/:id/whatsapp-send', async (req, res) => {
  try {
    const { phoneNumber } = sendWhatsAppSchema.parse(req.body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const pdfBuffer = await generateInvoicePDF(invoice, user);
    const base64Pdf = pdfBuffer.toString('base64');

    const whatsappApiKey = process.env.WHATSAPP_API_KEY;
    const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (whatsappApiKey && whatsappPhoneNumberId) {
      try {
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        const uploadRes = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/media`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              type: 'document',
              document: {
                filename: `${invoice.invoiceNumber}.pdf`,
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

        const messageRes = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedPhone,
              type: 'document',
              document: {
                id: uploadData.id,
                caption: `Invoice ${invoice.invoiceNumber} — Total: ₹${Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              },
            }),
          }
        );

        const messageData = await messageRes.json();
        if (messageData.messages) {
          return res.json({ success: true, method: 'whatsapp_business_api', messageId: messageData.messages[0].id });
        }

        throw new Error(messageData.error?.message || 'Failed to send via WhatsApp Business API');
      } catch (apiErr) {
        logger.warn({ err: apiErr }, 'WhatsApp Business API failed, falling back to wa.me link');
      }
    }

    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
    const msg = encodeURIComponent(
      `Invoice ${invoice.invoiceNumber}\n` +
      `Total: ₹${Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}\n\n` +
      `View and pay your invoice at: ${process.env.FRONTEND_URL || 'https://bill-by-billu.vercel.app'}/invoices`
    );
    const waLink = `https://wa.me/${formattedPhone}?text=${msg}`;

    res.json({ success: true, method: 'wa_me_link', link: waLink });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('WhatsApp send error:', err);
    res.status(500).json({ error: 'Failed to send via WhatsApp' });
  }
});

module.exports = router;
