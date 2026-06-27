const express = require('express');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { authenticate } = require('../middlewares/auth');
const prisma = require('../prisma');
const { formatCurrency } = require('../services/gst');
const logger = require('../logger');

const router = express.Router();

function parseDataUri(dataUri) {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;
  return { extension: match[1] === 'jpeg' ? 'jpg' : match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function generateInvoicePDF(invoice, user) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate UPI QR code if payment method is UPI
      let qrImage = null;
      if (invoice.paymentMethod === 'UPI' && user.upiId) {
        const upiString = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(user.businessName || user.name)}&am=${Number(invoice.totalAmount)}&cu=INR`;
        qrImage = await QRCode.toBuffer(upiString, { width: 150, margin: 1 });
      }

      // Parse static QR image if available
      let staticQrImage = null;
      if (user.qrUrl) {
        try {
          staticQrImage = parseDataUri(user.qrUrl);
        } catch (e) {
          logger.warn('Failed to parse static QR:', e.message);
        }
      }

      // Header with logo
      const leftX = 50;
      const rightX = 350;
      let headerY = 50;

      if (user.logoUrl) {
        try {
          const logoData = parseDataUri(user.logoUrl);
          if (logoData) {
            doc.image(logoData.buffer, leftX, headerY, { width: 80, height: 80, fit: [80, 80] });
          }
        } catch (e) {
          logger.warn('Failed to render logo in PDF:', e.message);
        }
      }

      doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
      doc.moveDown(0.5);

      // Supplier info (left) + Invoice details (right)
      headerY = user.logoUrl ? 50 : doc.y;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('From:', leftX, doc.y);
      doc.font('Helvetica');
      doc.text(invoice.supplierName || user.businessName || user.name, leftX);
      if (invoice.supplierGst) doc.text(`GSTIN: ${invoice.supplierGst}`, leftX);
      if (invoice.supplierAddress) doc.text(invoice.supplierAddress, leftX);

      doc.font('Helvetica-Bold');
      doc.text('Invoice #:', rightX, 90);
      doc.font('Helvetica');
      doc.text(invoice.invoiceNumber, rightX + 70, 90);
      doc.font('Helvetica-Bold');
      doc.text('Date:', rightX, 105);
      doc.font('Helvetica');
      doc.text(new Date(invoice.invoiceDate).toLocaleDateString('en-IN'), rightX + 70, 105);
      if (invoice.dueDate) {
        doc.font('Helvetica-Bold');
        doc.text('Due Date:', rightX, 120);
        doc.font('Helvetica');
        doc.text(new Date(invoice.dueDate).toLocaleDateString('en-IN'), rightX + 70, 120);
      }

      // Customer info
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold').text('To:', leftX);
      doc.font('Helvetica');
      doc.text(invoice.customerName || 'Walk-in Customer', leftX);
      if (invoice.customerGst) doc.text(`GSTIN: ${invoice.customerGst}`, leftX);
      if (invoice.customerAddress) doc.text(invoice.customerAddress, leftX);

      // Items table
      doc.moveDown(2);
      const tableTop = doc.y;
      const colWidths = [30, 150, 60, 50, 50, 50, 80];
      const headers = ['#', 'Description', 'HSN', 'Qty', 'Rate', 'GST%', 'Amount'];

      // Table header
      doc.fontSize(8).font('Helvetica-Bold');
      let x = 50;
      headers.forEach((h, i) => {
        doc.text(h, x, tableTop, { width: colWidths[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
        x += colWidths[i];
      });

      // Header line
      doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

      // Table rows
      doc.font('Helvetica').fontSize(8);
      let y = tableTop + 22;
      invoice.items.forEach((item, idx) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        x = 50;
        const rowData = [
          String(idx + 1),
          item.name + (item.description ? ` (${item.description})` : ''),
          item.hsnCode || '-',
          `${item.quantity} ${item.unit}`,
          formatCurrency(item.unitPrice),
          `${item.gstRate}%`,
          formatCurrency(item.totalAmount),
        ];
        rowData.forEach((val, i) => {
          doc.text(val, x, y, { width: colWidths[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
          x += colWidths[i];
        });
        y += 18;
      });

      // Totals
      y += 10;
      doc.moveTo(350, y).lineTo(540, y).stroke();
      y += 8;

      const addTotalRow = (label, value, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        doc.text(label, 370, y, { width: 120, align: 'right' });
        doc.text(value, 490, y, { width: 50, align: 'right' });
        y += 16;
      };

      addTotalRow('Subtotal:', formatCurrency(invoice.subtotal));
      if (Number(invoice.discountAmount) > 0) addTotalRow('Discount:', `-${formatCurrency(invoice.discountAmount)}`);
      if (Number(invoice.cgst) > 0) addTotalRow(`CGST:`, formatCurrency(invoice.cgst));
      if (Number(invoice.sgst) > 0) addTotalRow(`SGST:`, formatCurrency(invoice.sgst));
      if (Number(invoice.igst) > 0) addTotalRow(`IGST:`, formatCurrency(invoice.igst));
      addTotalRow('Total Tax:', formatCurrency(invoice.totalTax));
      y += 4;
      doc.moveTo(350, y).lineTo(540, y).stroke();
      y += 8;
      addTotalRow('Grand Total:', formatCurrency(invoice.totalAmount), true);

      // QR code
      if (qrImage) {
        doc.image(qrImage, 50, y + 10, { width: 100 });
        doc.fontSize(8).text('Scan UPI to pay', 50, y + 115);
        if (staticQrImage) {
          doc.image(staticQrImage.buffer, 170, y + 10, { width: 100, fit: [100, 100] });
          doc.fontSize(8).text('Or scan Paytm QR', 170, y + 115);
        }
      } else if (staticQrImage) {
        doc.image(staticQrImage.buffer, 50, y + 10, { width: 100, fit: [100, 100] });
        doc.fontSize(8).text('Scan to pay', 50, y + 115);
      }

      // Notes & Terms
      if (invoice.notes) {
        doc.fontSize(8).font('Helvetica-Bold').text('Notes:', 50, y + 130);
        doc.font('Helvetica').text(invoice.notes, 50, y + 142);
      }
      if (invoice.terms) {
        doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:', 50, y + 165);
        doc.font('Helvetica').text(invoice.terms, 50, y + 177);
      }

      // Footer
      doc.fontSize(7).font('Helvetica')
        .text('Generated by Bill By Billu — AI Invoice + GST for Indian Freelancers & SMBs', 50, 780, { align: 'center' });

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
