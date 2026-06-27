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

      let qrImage = null;
      if (invoice.paymentMethod === 'UPI' && user.upiId) {
        const upiString = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(user.businessName || user.name)}&am=${Number(invoice.totalAmount)}&cu=INR`;
        qrImage = await QRCode.toBuffer(upiString, { width: 100, margin: 1 });
      }

      let staticQrImage = null;
      if (user.qrUrl) {
        try { staticQrImage = parseDataUri(user.qrUrl); } catch (e) {
          logger.warn('Failed to parse static QR:', e.message);
        }
      }

      const leftX = 50;
      const rightX = 350;
      const pageWidth = 545;
      const pageBottom = 790;
      const ROW_HEIGHT = 16;
      const TOTALS_HEIGHT = 120;
      const QR_HEIGHT = 110;
      const RESERVE = TOTALS_HEIGHT + QR_HEIGHT;

      // ─── HEADER ───
      let y = 50;

      if (user.logoUrl) {
        try {
          const logoData = parseDataUri(user.logoUrl);
          if (logoData) {
            doc.image(logoData.buffer, leftX, y, { width: 50, height: 50, fit: [50, 50] });
          }
        } catch (e) {
          logger.warn('Failed to render logo in PDF:', e.message);
        }
      }

      const titleY = y + (user.logoUrl ? 58 : 0);
      doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', leftX, titleY, { align: 'center', width: pageWidth });

      // ─── SUPPLIER + INVOICE DETAILS ───
      const infoY = titleY + 28;

      doc.fontSize(9).font('Helvetica-Bold').text('From:', leftX, infoY);
      doc.font('Helvetica').text(invoice.supplierName || user.businessName || user.name, leftX, infoY + 13);
      let supplierEndY = infoY + 26;
      if (invoice.supplierGst) {
        doc.text(`GSTIN: ${invoice.supplierGst}`, leftX, supplierEndY);
        supplierEndY += 13;
      }
      if (invoice.supplierAddress) {
        doc.text(invoice.supplierAddress, leftX, supplierEndY, { width: 240 });
        supplierEndY += 13;
      }

      let detailY = infoY;
      doc.font('Helvetica-Bold').text('Invoice #:', rightX, detailY);
      doc.font('Helvetica').text(invoice.invoiceNumber, rightX + 70, detailY);
      detailY += 14;
      doc.font('Helvetica-Bold').text('Date:', rightX, detailY);
      doc.font('Helvetica').text(new Date(invoice.invoiceDate).toLocaleDateString('en-IN'), rightX + 70, detailY);
      detailY += 14;
      if (invoice.dueDate) {
        doc.font('Helvetica-Bold').text('Due Date:', rightX, detailY);
        doc.font('Helvetica').text(new Date(invoice.dueDate).toLocaleDateString('en-IN'), rightX + 70, detailY);
        detailY += 14;
      }
      if (invoice.paymentMethod) {
        doc.font('Helvetica-Bold').text('Payment:', rightX, detailY);
        doc.font('Helvetica').text(invoice.paymentMethod, rightX + 70, detailY);
        detailY += 14;
      }

      // ─── DIVIDER ───
      y = Math.max(supplierEndY, detailY) + 10;
      doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).stroke();

      // ─── CUSTOMER INFO ───
      y += 12;
      doc.fontSize(9).font('Helvetica-Bold').text('To:', leftX, y);
      y += 13;
      doc.font('Helvetica').text(invoice.customerName || 'Walk-in Customer', leftX, y);
      y += 13;
      if (invoice.customerGst) {
        doc.text(`GSTIN: ${invoice.customerGst}`, leftX, y);
        y += 13;
      }
      if (invoice.customerAddress) {
        doc.text(invoice.customerAddress, leftX, y, { width: 240 });
        y += 13;
      }

      // ─── ITEMS TABLE ───
      y += 10;
      const tableTop = y;
      const colWidths = [30, 150, 60, 50, 50, 50, 80];
      const colX = [50, 80, 230, 290, 340, 390, 440];
      const headers = ['#', 'Description', 'HSN', 'Qty', 'Rate', 'GST%', 'Amount'];

      function drawTableHeader(startY) {
        doc.rect(leftX, startY - 2, pageWidth, 16).fill('#f3f4f6');
        doc.fillColor('#000000');
        doc.fontSize(8).font('Helvetica-Bold');
        headers.forEach((h, i) => {
          doc.text(h, colX[i], startY + 1, { width: colWidths[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
        });
        doc.moveTo(leftX, startY + 14).lineTo(leftX + pageWidth, startY + 14).stroke();
        return startY + 18;
      }

      y = drawTableHeader(y);

      // Render items with smart page breaks
      doc.font('Helvetica').fontSize(8);
      const totalItems = invoice.items.length;
      invoice.items.forEach((item, idx) => {
        const remainingAfterThis = totalItems - idx - 1;
        const spaceNeeded = (remainingAfterThis * ROW_HEIGHT) + RESERVE;
        if (y + ROW_HEIGHT > pageBottom - spaceNeeded && idx > 0) {
          doc.addPage();
          y = 50;
          y = drawTableHeader(y);
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
        y += ROW_HEIGHT;
      });

      // ─── TOTALS ───
      y += 8;
      doc.moveTo(350, y).lineTo(leftX + pageWidth, y).stroke();
      y += 6;

      const addTotalRow = (label, value, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        doc.text(label, 370, y, { width: 120, align: 'right' });
        doc.text(value, 490, y, { width: 50, align: 'right' });
        y += 14;
      };

      addTotalRow('Subtotal:', formatCurrency(invoice.subtotal));
      if (Number(invoice.discountAmount) > 0) addTotalRow('Discount:', `-${formatCurrency(invoice.discountAmount)}`);
      if (Number(invoice.cgst) > 0) addTotalRow('CGST:', formatCurrency(invoice.cgst));
      if (Number(invoice.sgst) > 0) addTotalRow('SGST:', formatCurrency(invoice.sgst));
      if (Number(invoice.igst) > 0) addTotalRow('IGST:', formatCurrency(invoice.igst));
      addTotalRow('Total Tax:', formatCurrency(invoice.totalTax));
      y += 3;
      doc.moveTo(350, y).lineTo(leftX + pageWidth, y).stroke();
      y += 6;
      addTotalRow('Grand Total:', formatCurrency(invoice.totalAmount), true);

      // ─── QR CODES + NOTES ───
      y += 15;

      if (qrImage) {
        doc.image(qrImage, leftX, y, { width: 80, fit: [80, 80] });
        doc.fontSize(7).font('Helvetica').text('Scan UPI to pay', leftX, y + 85, { width: 80, align: 'center' });
      }

      if (staticQrImage) {
        const staticQrX = qrImage ? leftX + 100 : leftX;
        try {
          doc.image(staticQrImage.buffer, staticQrX, y, { width: 80, fit: [80, 80] });
          doc.fontSize(7).font('Helvetica').text('Scan Paytm QR', staticQrX, y + 85, { width: 80, align: 'center' });
        } catch (e) {
          logger.warn('Failed to render static QR in PDF:', e.message);
        }
      }

      const notesX = (qrImage || staticQrImage) ? leftX + 220 : leftX;
      let notesY = y;

      if (invoice.notes) {
        doc.fontSize(8).font('Helvetica-Bold').text('Notes:', notesX, notesY);
        doc.font('Helvetica').text(invoice.notes, notesX, notesY + 11, { width: 250 });
        notesY += 28;
      }
      if (invoice.terms) {
        doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:', notesX, notesY);
        doc.font('Helvetica').text(invoice.terms, notesX, notesY + 11, { width: 250 });
      }

      // ─── FOOTER ───
      doc.fontSize(7).font('Helvetica').fillColor('#999999')
        .text('Generated by Bill By Billu — AI Invoice + GST for Indian Freelancers & SMBs', leftX, pageBottom - 10, { align: 'center', width: pageWidth });

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
