const express = require('express');
const PDFDocument = require('pdfkit');
const { authenticate } = require('../middlewares/auth');
const prisma = require('../prisma');
const { formatCurrency } = require('../services/gst');
const { getTemplate } = require('../services/pdfTemplates');
const logger = require('../logger');

const router = express.Router();

async function generateInvoicePDF(invoice, user) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const templateFn = getTemplate(user.invoiceTemplate || 'classic');
      await templateFn(doc, invoice, user);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const pdfBuffer = await generateInvoicePDF(invoice, user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error({ err }, 'PDF generation failed');
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = { generateInvoicePDF, router };
