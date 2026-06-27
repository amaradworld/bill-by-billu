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
        qrImage = await QRCode.toBuffer(upiString, { width: 120, margin: 1 });
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

      const leftX = 50;
      const rightX = 350;
      const pageWidth = 545; // A4 width minus margins

      // ─── HEADER ───
      let headerTopY = 50;

      // Logo (top-left, max 60x60)
      if (user.logoUrl) {
        try {
          const logoData = parseDataUri(user.logoUrl);
          if (logoData) {
            doc.image(logoData.buffer, leftX, headerTopY, { width: 60, height: 60, fit: [60, 60] });
          }
        } catch (e) {
          logger.warn('Failed to render logo in PDF:', e.message);
        }
      }

      // Title — centered, below logo
      const titleY = headerTopY + (user.logoUrl ? 70 : 0);
      doc.fontSize(22).font('Helvetica-Bold').text('TAX INVOICE', leftX, titleY, { align: 'center', width: pageWidth });
      doc.moveDown(0.3);

      // ─── SUPPLIER INFO (left) + INVOICE DETAILS (right) ───
      const infoY = titleY + 35;

      // Supplier info (left)
      doc.fontSize(10).font('Helvetica-Bold').text('From:', leftX, infoY);
      doc.font('Helvetica').text(invoice.supplierName || user.businessName || user.name, leftX, infoY + 14);
      let supplierY = infoY + 28;
      if (invoice.supplierGst) {
        doc.text(`GSTIN: ${invoice.supplierGst}`, leftX, supplierY);
        supplierY += 14;
      }
      if (invoice.supplierAddress) {
        doc.text(invoice.supplierAddress, leftX, supplierY, { width: 250 });
        supplierY += 14;
      }

      // Invoice details (right)
      let detailY = infoY;
      const detailLabelX = rightX;
      const detailValueX = rightX + 75;

      doc.font('Helvetica-Bold').text('Invoice #:', detailLabelX, detailY);
      doc.font('Helvetica').text(invoice.invoiceNumber, detailValueX, detailY);
      detailY += 15;

      doc.font('Helvetica-Bold').text('Date:', detailLabelX, detailY);
      doc.font('Helvetica').text(new Date(invoice.invoiceDate).toLocaleDateString('en-IN'), detailValueX, detailY);
      detailY += 15;

      if (invoice.dueDate) {
        doc.font('Helvetica-Bold').text('Due Date:', detailLabelX, detailY);
        doc.font('Helvetica').text(new Date(invoice.dueDate).toLocaleDateString('en-IN'), detailValueX, detailY);
        detailY += 15;
      }
      if (invoice.paymentMethod) {
        doc.font('Helvetica-Bold').text('Payment:', detailLabelX, detailY);
        doc.font('Helvetica').text(invoice.paymentMethod, detailValueX, detailY);
        detailY += 15;
      }

      // ─── DIVIDER ───
      const dividerY = Math.max(supplierY, detailY) + 15;
      doc.moveTo(leftX, dividerY).lineTo(leftX + pageWidth, dividerY).stroke();

      // ─── CUSTOMER INFO ───
      let custY = dividerY + 15;
      doc.fontSize(10).font('Helvetica-Bold').text('To:', leftX, custY);
      custY += 14;
      doc.font('Helvetica').text(invoice.customerName || 'Walk-in Customer', leftX, custY);
      custY += 14;
      if (invoice.customerGst) {
        doc.text(`GSTIN: ${invoice.customerGst}`, leftX, custY);
        custY += 14;
      }
      if (invoice.customerAddress) {
        doc.text(invoice.customerAddress, leftX, custY, { width: 250 });
        custY += 14;
      }

      // ─── ITEMS TABLE ───
      custY += 10;
      const tableTop = custY;
      const colWidths = [30, 150, 60, 50, 50, 50, 80];
      const colX = [50, 80, 230, 290, 340, 390, 440];
      const headers = ['#', 'Description', 'HSN', 'Qty', 'Rate', 'GST%', 'Amount'];

      // Table header background
      doc.rect(leftX, tableTop - 2, pageWidth, 18).fill('#f3f4f6');
      doc.fillColor('#000000');

      // Table header text
      doc.fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, colX[i], tableTop + 2, { width: colWidths[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
      });

      // Header bottom line
      doc.moveTo(leftX, tableTop + 16).lineTo(leftX + pageWidth, tableTop + 16).stroke();

      // Table rows
      doc.font('Helvetica').fontSize(8);
      let y = tableTop + 22;
      invoice.items.forEach((item, idx) => {
        if (y > 650) {
          doc.addPage();
          y = 50;
        }
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
          doc.text(val, colX[i], y, { width: colWidths[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
        });
        y += 18;
      });

      // ─── TOTALS ───
      y += 5;
      doc.moveTo(350, y).lineTo(leftX + pageWidth, y).stroke();
      y += 8;

      const addTotalRow = (label, value, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        doc.text(label, 370, y, { width: 120, align: 'right' });
        doc.text(value, 490, y, { width: 50, align: 'right' });
        y += 16;
      };

      addTotalRow('Subtotal:', formatCurrency(invoice.subtotal));
      if (Number(invoice.discountAmount) > 0) addTotalRow('Discount:', `-${formatCurrency(invoice.discountAmount)}`);
      if (Number(invoice.cgst) > 0) addTotalRow('CGST:', formatCurrency(invoice.cgst));
      if (Number(invoice.sgst) > 0) addTotalRow('SGST:', formatCurrency(invoice.sgst));
      if (Number(invoice.igst) > 0) addTotalRow('IGST:', formatCurrency(invoice.igst));
      addTotalRow('Total Tax:', formatCurrency(invoice.totalTax));
      y += 4;
      doc.moveTo(350, y).lineTo(leftX + pageWidth, y).stroke();
      y += 8;
      addTotalRow('Grand Total:', formatCurrency(invoice.totalAmount), true);

      // ─── QR CODES (bottom-left) ───
      let qrBottomY = y + 15;

      if (qrImage) {
        doc.image(qrImage, leftX, qrBottomY, { width: 90, fit: [90, 90] });
        doc.fontSize(7).font('Helvetica').text('Scan UPI to pay', leftX, qrBottomY + 95, { width: 90, align: 'center' });
      }

      if (staticQrImage) {
        const staticQrX = qrImage ? leftX + 110 : leftX;
        try {
          doc.image(staticQrImage.buffer, staticQrX, qrBottomY, { width: 90, fit: [90, 90] });
          doc.fontSize(7).font('Helvetica').text('Scan Paytm QR', staticQrX, qrBottomY + 95, { width: 90, align: 'center' });
        } catch (e) {
          logger.warn('Failed to render static QR in PDF:', e.message);
        }
      }

      // ─── NOTES & TERMS (right side or below QR) ───
      const notesX = (qrImage || staticQrImage) ? leftX + 240 : leftX;
      let notesY = qrBottomY;

      if (invoice.notes) {
        doc.fontSize(8).font('Helvetica-Bold').text('Notes:', notesX, notesY);
        doc.font('Helvetica').text(invoice.notes, notesX, notesY + 12, { width: 250 });
        notesY += 30;
      }
      if (invoice.terms) {
        doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:', notesX, notesY);
        doc.font('Helvetica').text(invoice.terms, notesX, notesY + 12, { width: 250 });
      }

      // ─── FOOTER ───
      doc.fontSize(7).font('Helvetica').fillColor('#999999')
        .text('Generated by Bill By Billu — AI Invoice + GST for Indian Freelancers & SMBs', leftX, 810, { align: 'center', width: pageWidth });

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
