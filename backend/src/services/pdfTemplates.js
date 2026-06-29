const QRCode = require('qrcode');
const { formatCurrency } = require('./gst');

function parseDataUri(dataUri) {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;
  return { extension: match[1] === 'jpeg' ? 'jpg' : match[1], buffer: Buffer.from(match[2], 'base64') };
}

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  result += ' Only';
  return result;
}

function drawRoundedRect(doc, x, y, w, h, r, fill, stroke) {
  doc.save();
  if (fill) doc.fillColor(fill);
  if (stroke) doc.strokeColor(stroke);
  doc.roundedRect(x, y, w, h, r);
  if (fill && stroke) doc.fillAndStroke();
  else if (fill) doc.fill();
  else if (stroke) doc.stroke();
  doc.restore();
}

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'paid': return { bg: '#dcfce7', text: '#166534', label: 'PAID' };
    case 'partial': return { bg: '#fef3c7', text: '#92400e', label: 'PARTIAL' };
    default: return { bg: '#fee2e2', text: '#991b1b', label: 'UNPAID' };
  }
}

// ═══════════════════════════════════════════════════════════════
// CLASSIC TEMPLATE — Clean, minimal, blue/white (Zoho-style)
// ═══════════════════════════════════════════════════════════════
async function classicTemplate(doc, invoice, user) {
  const leftX = 50;
  const rightX = 350;
  const pageWidth = 545;
  const pageBottom = 790;
  const ROW_HEIGHT = 16;
  const BLUE = '#2563eb';
  const BLUE_LIGHT = '#eff6ff';
  const GRAY_BG = '#f8fafc';
  const GRAY_BORDER = '#e2e8f0';
  const DARK = '#0f172a';
  const MUTED = '#64748b';

  let qrImage = null;
  if (invoice.paymentMethod === 'UPI' && user.upiId) {
    const upiString = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(user.businessName || user.name)}&am=${Number(invoice.totalAmount)}&cu=INR`;
    qrImage = await QRCode.toBuffer(upiString, { width: 100, margin: 1 });
  }

  let staticQrImage = null;
  if (user.qrUrl) {
    try { staticQrImage = parseDataUri(user.qrUrl); } catch (e) {}
  }

  // ─── HEADER BAR ───
  let y = 0;
  doc.rect(0, 0, 595.28, 6).fill(BLUE);

  y = 30;
  if (user.logoUrl) {
    try {
      const logoData = parseDataUri(user.logoUrl);
      if (logoData) doc.image(logoData.buffer, leftX, y, { width: 45, height: 45, fit: [45, 45] });
    } catch (e) {}
  }

  const titleY = y + (user.logoUrl ? 53 : 0);
  doc.fontSize(22).font('Helvetica-Bold').fillColor(BLUE).text('TAX INVOICE', leftX, titleY);
  doc.fontSize(8).font('Helvetica').fillColor(MUTED).text('GST Compliant Invoice', leftX, titleY + 24);

  // Status badge
  const status = getStatusColor(invoice.paymentStatus);
  drawRoundedRect(doc, 460, y, 85, 24, 12, status.bg);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(status.text).text(status.label, 460, y + 7, { width: 85, align: 'center' });

  // ─── SUPPLIER + INVOICE INFO CARDS ───
  y = titleY + 44;
  drawRoundedRect(doc, leftX, y, 240, 80, 6, GRAY_BG, GRAY_BORDER);
  drawRoundedRect(doc, rightX, y, 245, 80, 6, GRAY_BG, GRAY_BORDER);

  doc.fontSize(7).font('Helvetica-Bold').fillColor(BLUE).text('FROM', leftX + 10, y + 8);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK).text(user.businessName || user.name, leftX + 10, y + 20);
  let fromY = y + 31;
  doc.fontSize(7).font('Helvetica').fillColor(MUTED);
  if (invoice.supplierGst) { doc.text(`GSTIN: ${invoice.supplierGst}`, leftX + 10, fromY); fromY += 11; }
  if (invoice.supplierAddress) { doc.text(invoice.supplierAddress, leftX + 10, fromY, { width: 220 }); fromY += 11; }
  if (user.state && !invoice.supplierAddress?.toLowerCase().includes(user.state.toLowerCase())) { doc.text(user.state, leftX + 10, fromY); }

  doc.fontSize(7).font('Helvetica-Bold').fillColor(BLUE).text('INVOICE DETAILS', rightX + 10, y + 8);
  let detY = y + 20;
  const detX = rightX + 10;
  const detValX = rightX + 80;
  doc.fontSize(7).font('Helvetica').fillColor(MUTED);
  doc.text('Invoice #:', detX, detY); doc.font('Helvetica-Bold').fillColor(DARK).text(invoice.invoiceNumber, detValX, detY);
  detY += 13;
  doc.font('Helvetica').fillColor(MUTED).text('Date:', detX, detY); doc.font('Helvetica-Bold').fillColor(DARK).text(new Date(invoice.invoiceDate).toLocaleDateString('en-IN'), detValX, detY);
  detY += 13;
  if (invoice.dueDate) { doc.font('Helvetica').fillColor(MUTED).text('Due Date:', detX, detY); doc.font('Helvetica-Bold').fillColor(DARK).text(new Date(invoice.dueDate).toLocaleDateString('en-IN'), detValX, detY); detY += 13; }
  if (invoice.paymentMethod) { doc.font('Helvetica').fillColor(MUTED).text('Payment:', detX, detY); doc.font('Helvetica-Bold').fillColor(DARK).text(invoice.paymentMethod, detValX, detY); }

  // ─── CUSTOMER INFO ───
  y = y + 90;
  drawRoundedRect(doc, leftX, y, pageWidth, 40, 6, BLUE_LIGHT, GRAY_BORDER);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(BLUE).text('BILL TO', leftX + 10, y + 8);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text(invoice.customerName || 'Walk-in Customer', leftX + 10, y + 20);
  let custY = y + 31;
  doc.fontSize(7).font('Helvetica').fillColor(MUTED);
  if (invoice.customerGst) { doc.text(`GSTIN: ${invoice.customerGst}`, leftX + 10, custY); custY += 11; }
  if (invoice.customerAddress) { doc.text(invoice.customerAddress, leftX + 10, custY, { width: 400 }); }

  // ─── ITEMS TABLE ───
  y = y + 50;
  const colX = [50, 80, 210, 275, 320, 365, 405, 445, 490];
  const colW = [30, 130, 65, 45, 45, 40, 40, 45, 55];
  const headers = ['#', 'Item Name', 'HSN/SAC', 'Qty', 'Rate', 'Disc.', 'GST%', 'Tax', 'Total'];

  function drawHeader(sy) {
    doc.rect(leftX, sy - 2, pageWidth, 16).fill(BLUE);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
    headers.forEach((h, i) => {
      doc.text(h, colX[i], sy + 1, { width: colW[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
    });
    doc.moveTo(leftX, sy + 14).lineTo(leftX + pageWidth, sy + 14).strokeColor(GRAY_BORDER).lineWidth(0.5).stroke();
    return sy + 18;
  }

  y = drawHeader(y);

  const totalItems = invoice.items.length;
  const RESERVE = 180;

  doc.font('Helvetica').fontSize(7).fillColor(DARK);
  invoice.items.forEach((item, idx) => {
    const remainingAfterThis = totalItems - idx - 1;
    const spaceNeeded = (remainingAfterThis * ROW_HEIGHT) + RESERVE;
    if (y + ROW_HEIGHT > pageBottom - spaceNeeded && idx > 0) {
      doc.addPage();
      y = 50;
      y = drawHeader(y);
    }

    const bgColor = idx % 2 === 0 ? '#ffffff' : GRAY_BG;
    doc.rect(leftX, y - 2, pageWidth, ROW_HEIGHT).fill(bgColor);

    const taxAmt = Number(item.totalAmount) - (Number(item.unitPrice) * Number(item.quantity));
    let itemName = item.name + (item.description ? ` (${item.description})` : '');
    if (itemName.length > 28) itemName = itemName.slice(0, 26) + '..';
    const rowData = [
      String(idx + 1),
      itemName,
      item.hsnCode || '-',
      `${item.quantity} ${item.unit}`,
      formatCurrency(item.unitPrice),
      item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-',
      `${item.gstRate}%`,
      formatCurrency(taxAmt),
      formatCurrency(item.totalAmount),
    ];
    doc.fillColor(DARK);
    rowData.forEach((val, i) => {
      doc.text(val, colX[i], y, { width: colW[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
    });
    y += ROW_HEIGHT;
  });

  // Bottom border
  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor(GRAY_BORDER).lineWidth(0.5).stroke();

  // ─── TOTALS ───
  y += 10;
  const totalsX = 355;
  const totalsValX = 490;
  const totalsW = 155;

  const addRow = (label, value, bold = false, color = DARK) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(color);
    doc.text(label, totalsX, y, { width: 100, align: 'right' });
    doc.text(value, totalsValX, y, { width: 90, align: 'right' });
    y += 13;
  };

  addRow('Subtotal:', formatCurrency(invoice.subtotal));
  if (Number(invoice.discountAmount) > 0) addRow('Discount:', `-${formatCurrency(invoice.discountAmount)}`, false, '#dc2626');
  if (Number(invoice.cgst) > 0) addRow('CGST:', formatCurrency(invoice.cgst));
  if (Number(invoice.sgst) > 0) addRow('SGST:', formatCurrency(invoice.sgst));
  if (Number(invoice.igst) > 0) addRow('IGST:', formatCurrency(invoice.igst));
  if (Number(invoice.totalTax) > 0) addRow('Total Tax:', formatCurrency(invoice.totalTax), false, MUTED);

  y += 2;
  doc.moveTo(totalsX, y).lineTo(leftX + pageWidth, y).strokeColor(BLUE).lineWidth(1).stroke();
  y += 6;

  // Grand total in blue card — wider box to prevent overflow
  drawRoundedRect(doc, totalsX - 5, y - 5, 195, 26, 4, BLUE);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
  doc.text('Grand Total:', totalsX, y, { width: 100, align: 'right' });
  doc.text(formatCurrency(invoice.totalAmount), totalsValX, y, { width: 85, align: 'right' });
  y += 28;

  // Amount in words
  doc.fontSize(7).font('Helvetica').fillColor(MUTED);
  doc.text(`Amount in Words: ${numberToWords(Number(invoice.totalAmount))}`, leftX, y, { width: pageWidth });
  y += 16;

  // ─── QR + BANK + TERMS ───
  const bottomSectionY = y;

  if (qrImage) {
    doc.image(qrImage, leftX, y, { width: 70, fit: [70, 70] });
    doc.fontSize(6).font('Helvetica').fillColor(MUTED).text('Scan UPI to pay', leftX, y + 73, { width: 70, align: 'center' });
  }
  if (staticQrImage) {
    const sx = qrImage ? leftX + 85 : leftX;
    try {
      doc.image(staticQrImage.buffer, sx, y, { width: 70, fit: [70, 70] });
      doc.fontSize(6).font('Helvetica').fillColor(MUTED).text('Scan Paytm QR', sx, y + 73, { width: 70, align: 'center' });
    } catch (e) {}
  }

  const notesX = (qrImage || staticQrImage) ? leftX + 190 : leftX;
  let notesY = y;

  if (invoice.notes) {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(BLUE).text('Notes:', notesX, notesY);
    doc.font('Helvetica').fillColor(DARK).text(invoice.notes, notesX, notesY + 10, { width: 200 });
    notesY += 24;
  }

  // Bank details
  if (user.bankName || user.bankAccount) {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(BLUE).text('Bank Details:', notesX, notesY);
    notesY += 10;
    doc.fontSize(7).font('Helvetica').fillColor(DARK);
    if (user.bankName) { doc.text(`Bank: ${user.bankName}`, notesX, notesY); notesY += 10; }
    if (user.bankAccount) { doc.text(`A/C: ${user.bankAccount}`, notesX, notesY); notesY += 10; }
    if (user.bankIfsc) { doc.text(`IFSC: ${user.bankIfsc}`, notesX, notesY); notesY += 10; }
    if (user.bankBranch) { doc.text(`Branch: ${user.bankBranch}`, notesX, notesY); notesY += 10; }
  }

  if (invoice.terms) {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(BLUE).text('Terms & Conditions:', notesX, notesY);
    doc.font('Helvetica').fillColor(DARK).text(invoice.terms, notesX, notesY + 10, { width: 200 });
  }

  // ─── SIGNATURE ───
  const sigY = pageBottom - 60;
  doc.moveTo(leftX, sigY).lineTo(leftX + 200, sigY).strokeColor(GRAY_BORDER).lineWidth(0.5).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(MUTED).text('Authorized Signatory', leftX, sigY + 4);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK).text(user.businessName || user.name, leftX, sigY + 15);

  // ─── FOOTER ───
  doc.rect(0, pageBottom - 20, 595.28, 20).fill(BLUE);
  doc.fontSize(6).font('Helvetica').fillColor('#ffffff')
    .text('Generated by Bill By Billu — AI Invoice + GST for Indian Businesses', 0, pageBottom - 14, { align: 'center', width: 595.28 });
}

// ═══════════════════════════════════════════════════════════════
// MODERN TEMPLATE — Purple gradient, soft shadows, premium
// ═══════════════════════════════════════════════════════════════
async function modernTemplate(doc, invoice, user) {
  const leftX = 45;
  const rightX = 345;
  const pageWidth = 555;
  const pageBottom = 790;
  const ROW_HEIGHT = 16;
  const PURPLE = '#7c3aed';
  const PURPLE_LIGHT = '#f5f3ff';
  const PURPLE_DARK = '#5b21b6';
  const DARK = '#1e1b4b';
  const MUTED = '#6b7280';
  const GRAY_BG = '#fafafa';
  const BORDER = '#e5e7eb';

  let qrImage = null;
  if (invoice.paymentMethod === 'UPI' && user.upiId) {
    const upiString = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(user.businessName || user.name)}&am=${Number(invoice.totalAmount)}&cu=INR`;
    qrImage = await QRCode.toBuffer(upiString, { width: 100, margin: 1 });
  }

  let staticQrImage = null;
  if (user.qrUrl) {
    try { staticQrImage = parseDataUri(user.qrUrl); } catch (e) {}
  }

  // ─── TOP GRADIENT BAR ───
  doc.rect(0, 0, 595.28, 80).fill(PURPLE);
  doc.rect(0, 80, 595.28, 4).fill(PURPLE_DARK);

  // Logo + Title
  let y = 20;
  if (user.logoUrl) {
    try {
      const logoData = parseDataUri(user.logoUrl);
      if (logoData) doc.image(logoData.buffer, leftX, y, { width: 40, height: 40, fit: [40, 40] });
    } catch (e) {}
  }

  const titleX = user.logoUrl ? leftX + 50 : leftX;
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff').text('TAX INVOICE', titleX, y + 2);
  doc.fontSize(8).font('Helvetica').fillColor('#c4b5fd').text('GST Compliant • Premium', titleX, y + 28);

  // Status badge
  const status = getStatusColor(invoice.paymentStatus);
  drawRoundedRect(doc, 460, 20, 90, 28, 14, status.bg);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(status.text).text(status.label, 460, 27, { width: 90, align: 'center' });

  // Invoice # on the right of header
  doc.fontSize(8).font('Helvetica').fillColor('#c4b5fd').text(`#${invoice.invoiceNumber}`, 460, 55, { width: 90, align: 'center' });

  // ─── INFO CARDS ───
  y = 96;

  // From card
  drawRoundedRect(doc, leftX, y, 245, 85, 8, '#ffffff', BORDER);
  doc.rect(leftX, y, 4, 85).fill(PURPLE);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(PURPLE).text('FROM', leftX + 14, y + 8);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text(user.businessName || user.name, leftX + 14, y + 20);
  let fromY = y + 33;
  doc.fontSize(7).font('Helvetica').fillColor(MUTED);
  if (invoice.supplierGst) { doc.text(`GSTIN: ${invoice.supplierGst}`, leftX + 14, fromY); fromY += 11; }
  if (invoice.supplierAddress) { doc.text(invoice.supplierAddress, leftX + 14, fromY, { width: 220 }); fromY += 11; }
  if (user.state && !invoice.supplierAddress?.toLowerCase().includes(user.state.toLowerCase())) doc.text(user.state, leftX + 14, fromY);

  // Details card
  drawRoundedRect(doc, rightX, y, 260, 85, 8, '#ffffff', BORDER);
  doc.rect(rightX, y, 4, 85).fill(PURPLE);
  let detY = y + 8;
  const detX = rightX + 14;
  const detValX = rightX + 85;

  const detailRows = [
    ['Invoice #', invoice.invoiceNumber],
    ['Date', new Date(invoice.invoiceDate).toLocaleDateString('en-IN')],
    ['Due Date', invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '-'],
    ['Payment', invoice.paymentMethod || '-'],
  ];

  detailRows.forEach(([label, val]) => {
    doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(label + ':', detX, detY);
    doc.font('Helvetica-Bold').fillColor(DARK).text(val, detValX, detY);
    detY += 13;
  });

  // ─── BILL TO ───
  y = y + 95;
  drawRoundedRect(doc, leftX, y, pageWidth, 42, 8, PURPLE_LIGHT, BORDER);
  doc.rect(leftX, y, 4, 42).fill(PURPLE);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(PURPLE).text('BILL TO', leftX + 14, y + 8);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(invoice.customerName || 'Walk-in Customer', leftX + 14, y + 20);
  let custY = y + 33;
  doc.fontSize(7).font('Helvetica').fillColor(MUTED);
  if (invoice.customerGst) { doc.text(`GSTIN: ${invoice.customerGst}`, leftX + 14, custY); custY += 11; }
  if (invoice.customerAddress) doc.text(invoice.customerAddress, leftX + 14, custY, { width: 400 });

  // ─── ITEMS TABLE ───
  y = y + 52;
  const colX = [45, 75, 205, 270, 315, 360, 400, 440, 485];
  const colW = [30, 130, 65, 45, 45, 40, 40, 45, 60];
  const headers = ['#', 'Item Name', 'HSN/SAC', 'Qty', 'Rate', 'Disc.', 'GST%', 'Tax', 'Total'];

  function drawHeader(sy) {
    drawRoundedRect(doc, leftX, sy - 2, pageWidth, 16, 4, PURPLE);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
    headers.forEach((h, i) => {
      doc.text(h, colX[i], sy + 1, { width: colW[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
    });
    return sy + 18;
  }

  y = drawHeader(y);

  const totalItems = invoice.items.length;
  const RESERVE = 180;

  doc.font('Helvetica').fontSize(7).fillColor(DARK);
  invoice.items.forEach((item, idx) => {
    const remainingAfterThis = totalItems - idx - 1;
    const spaceNeeded = (remainingAfterThis * ROW_HEIGHT) + RESERVE;
    if (y + ROW_HEIGHT > pageBottom - spaceNeeded && idx > 0) {
      doc.addPage();
      y = 50;
      y = drawHeader(y);
    }

    const bgColor = idx % 2 === 0 ? '#ffffff' : PURPLE_LIGHT;
    drawRoundedRect(doc, leftX, y - 2, pageWidth, ROW_HEIGHT, 2, bgColor);

    const taxAmt = Number(item.totalAmount) - (Number(item.unitPrice) * Number(item.quantity));
    let itemName = item.name + (item.description ? ` (${item.description})` : '');
    if (itemName.length > 28) itemName = itemName.slice(0, 26) + '..';
    const rowData = [
      String(idx + 1),
      itemName,
      item.hsnCode || '-',
      `${item.quantity} ${item.unit}`,
      formatCurrency(item.unitPrice),
      item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-',
      `${item.gstRate}%`,
      formatCurrency(taxAmt),
      formatCurrency(item.totalAmount),
    ];
    doc.fillColor(DARK);
    rowData.forEach((val, i) => {
      doc.text(val, colX[i], y, { width: colW[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
    });
    y += ROW_HEIGHT;
  });

  // ─── TOTALS ───
  y += 10;
  const totalsX = 375;
  const totalsValX = 495;
  const totalsW = 120;

  drawRoundedRect(doc, totalsX - 10, y - 5, 190, 100, 8, PURPLE_LIGHT, BORDER);

  const addRow = (label, value, bold = false, color = DARK) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(color);
    doc.text(label, totalsX, y, { width: 100, align: 'right' });
    doc.text(value, totalsValX, y, { width: 60, align: 'right' });
    y += 13;
  };

  addRow('Subtotal:', formatCurrency(invoice.subtotal));
  if (Number(invoice.discountAmount) > 0) addRow('Discount:', `-${formatCurrency(invoice.discountAmount)}`, false, '#dc2626');
  if (Number(invoice.cgst) > 0) addRow('CGST:', formatCurrency(invoice.cgst));
  if (Number(invoice.sgst) > 0) addRow('SGST:', formatCurrency(invoice.sgst));
  if (Number(invoice.igst) > 0) addRow('IGST:', formatCurrency(invoice.igst));

  y += 2;
  doc.moveTo(totalsX, y).lineTo(totalsX + 165, y).strokeColor(PURPLE).lineWidth(1).stroke();
  y += 5;

  // Grand total
  drawRoundedRect(doc, totalsX - 10, y - 4, 190, 24, 8, PURPLE);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
  doc.text('Grand Total:', totalsX, y, { width: 100, align: 'right' });
  doc.text(formatCurrency(invoice.totalAmount), totalsValX, y, { width: 60, align: 'right' });
  y += 28;

  // Amount in words
  doc.fontSize(7).font('Helvetica').fillColor(MUTED);
  doc.text(`Amount in Words: ${numberToWords(Number(invoice.totalAmount))}`, leftX, y, { width: pageWidth });
  y += 16;

  // ─── QR + BANK + TERMS ───
  if (qrImage) {
    doc.image(qrImage, leftX, y, { width: 65, fit: [65, 65] });
    doc.fontSize(6).font('Helvetica').fillColor(MUTED).text('Scan UPI to pay', leftX, y + 68, { width: 65, align: 'center' });
  }
  if (staticQrImage) {
    const sx = qrImage ? leftX + 80 : leftX;
    try {
      doc.image(staticQrImage.buffer, sx, y, { width: 65, fit: [65, 65] });
      doc.fontSize(6).font('Helvetica').fillColor(MUTED).text('Scan Paytm QR', sx, y + 68, { width: 65, align: 'center' });
    } catch (e) {}
  }

  const notesX = (qrImage || staticQrImage) ? leftX + 180 : leftX;
  let notesY = y;

  if (invoice.notes) {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(PURPLE).text('Notes:', notesX, notesY);
    doc.font('Helvetica').fillColor(DARK).text(invoice.notes, notesX, notesY + 10, { width: 200 });
    notesY += 24;
  }

  if (user.bankName || user.bankAccount) {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(PURPLE).text('Bank Details:', notesX, notesY);
    notesY += 10;
    doc.fontSize(7).font('Helvetica').fillColor(DARK);
    if (user.bankName) { doc.text(`Bank: ${user.bankName}`, notesX, notesY); notesY += 10; }
    if (user.bankAccount) { doc.text(`A/C: ${user.bankAccount}`, notesX, notesY); notesY += 10; }
    if (user.bankIfsc) { doc.text(`IFSC: ${user.bankIfsc}`, notesX, notesY); notesY += 10; }
    if (user.bankBranch) { doc.text(`Branch: ${user.bankBranch}`, notesX, notesY); notesY += 10; }
  }

  if (invoice.terms) {
    doc.fontSize(7).font('Helvetica-Bold').fillColor(PURPLE).text('Terms & Conditions:', notesX, notesY);
    doc.font('Helvetica').fillColor(DARK).text(invoice.terms, notesX, notesY + 10, { width: 200 });
  }

  // ─── SIGNATURE ───
  const sigY = pageBottom - 55;
  doc.moveTo(leftX, sigY).lineTo(leftX + 200, sigY).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.fontSize(7).font('Helvetica').fillColor(MUTED).text('Authorized Signatory', leftX, sigY + 4);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK).text(user.businessName || user.name, leftX, sigY + 15);

  // ─── FOOTER ───
  doc.rect(0, pageBottom - 18, 595.28, 18).fill(PURPLE);
  doc.fontSize(6).font('Helvetica').fillColor('#ffffff')
    .text('Generated by Bill By Billu — AI Invoice + GST for Indian Businesses', 0, pageBottom - 12, { align: 'center', width: 595.28 });
}

// ═══════════════════════════════════════════════════════════════
// COMPACT TEMPLATE — Space-efficient, dense, many items
// ═══════════════════════════════════════════════════════════════
async function compactTemplate(doc, invoice, user) {
  const leftX = 40;
  const rightX = 340;
  const pageWidth = 565;
  const pageBottom = 790;
  const ROW_HEIGHT = 13;
  const TEAL = '#0d9488';
  const TEAL_LIGHT = '#f0fdfa';
  const DARK = '#111827';
  const MUTED = '#6b7280';
  const BORDER = '#d1d5db';

  let qrImage = null;
  if (invoice.paymentMethod === 'UPI' && user.upiId) {
    const upiString = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(user.businessName || user.name)}&am=${Number(invoice.totalAmount)}&cu=INR`;
    qrImage = await QRCode.toBuffer(upiString, { width: 80, margin: 1 });
  }

  let staticQrImage = null;
  if (user.qrUrl) {
    try { staticQrImage = parseDataUri(user.qrUrl); } catch (e) {}
  }

  // ─── HEADER ───
  let y = 30;
  doc.rect(leftX, y - 5, pageWidth, 1).fill(TEAL);

  if (user.logoUrl) {
    try {
      const logoData = parseDataUri(user.logoUrl);
      if (logoData) doc.image(logoData.buffer, leftX, y, { width: 30, height: 30, fit: [30, 30] });
    } catch (e) {}
  }

  const titleX = user.logoUrl ? leftX + 36 : leftX;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(TEAL).text('TAX INVOICE', titleX, y);
  doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(user.businessName || user.name, titleX, y + 16);

  // Status
  const status = getStatusColor(invoice.paymentStatus);
  drawRoundedRect(doc, 490, y, 70, 18, 9, status.bg);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(status.text).text(status.label, 490, y + 5, { width: 70, align: 'center' });

  // ─── COMPACT INFO ROW ───
  y += 36;
  doc.rect(leftX, y, pageWidth, 1).fill(BORDER);
  y += 4;

  doc.fontSize(7).font('Helvetica').fillColor(MUTED);
  let infoX = leftX;
  const infoItems = [
    [`Invoice: ${invoice.invoiceNumber}`, 100],
    [`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 80],
    [invoice.dueDate ? `Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}` : '', 80],
    [invoice.paymentMethod ? `Mode: ${invoice.paymentMethod}` : '', 70],
    [invoice.supplierGst ? `GSTIN: ${invoice.supplierGst}` : '', 110],
  ];
  infoItems.forEach(([text, w]) => {
    if (text) { doc.text(text, infoX, y, { width: w }); infoX += w; }
  });

  y += 14;
  doc.rect(leftX, y, pageWidth, 1).fill(BORDER);
  y += 4;

  // ─── CUSTOMER (inline) ───
  doc.fontSize(7).font('Helvetica-Bold').fillColor(TEAL).text('To:', leftX, y);
  doc.font('Helvetica').fillColor(DARK).text(invoice.customerName || 'Walk-in Customer', leftX + 20, y);
  if (invoice.customerGst) {
    doc.font('Helvetica').fillColor(MUTED).text(`| GSTIN: ${invoice.customerGst}`, leftX + 20 + (invoice.customerName || 'Walk-in Customer').length * 4 + 5, y);
  }
  y += 10;
  if (invoice.customerAddress) {
    doc.fontSize(6).font('Helvetica').fillColor(MUTED).text(invoice.customerAddress, leftX, y, { width: pageWidth });
    y += 8;
  }

  y += 2;
  doc.rect(leftX, y, pageWidth, 1).fill(BORDER);
  y += 4;

  // ─── ITEMS TABLE ───
  const colX = [40, 65, 195, 260, 305, 350, 390, 430, 475, 520];
  const colW = [25, 130, 65, 45, 45, 40, 40, 45, 45, 45];
  const headers = ['#', 'Item Name', 'HSN/SAC', 'Qty', 'Rate', 'Disc.', 'GST%', 'Tax', 'Total'];

  function drawHeader(sy) {
    doc.rect(leftX, sy - 2, pageWidth, 13).fill(TEAL);
    doc.fontSize(6).font('Helvetica-Bold').fillColor('#ffffff');
    headers.forEach((h, i) => {
      doc.text(h, colX[i], sy + 1, { width: colW[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
    });
    doc.moveTo(leftX, sy + 11).lineTo(leftX + pageWidth, sy + 11).strokeColor(BORDER).lineWidth(0.5).stroke();
    return sy + 14;
  }

  y = drawHeader(y);

  const totalItems = invoice.items.length;
  const RESERVE = 140;

  doc.font('Helvetica').fontSize(6.5).fillColor(DARK);
  invoice.items.forEach((item, idx) => {
    const remainingAfterThis = totalItems - idx - 1;
    const spaceNeeded = (remainingAfterThis * ROW_HEIGHT) + RESERVE;
    if (y + ROW_HEIGHT > pageBottom - spaceNeeded && idx > 0) {
      doc.addPage();
      y = 40;
      y = drawHeader(y);
    }

    if (idx % 2 === 1) {
      doc.rect(leftX, y - 2, pageWidth, ROW_HEIGHT).fill(TEAL_LIGHT);
    }

    const taxAmt = Number(item.totalAmount) - (Number(item.unitPrice) * Number(item.quantity));
    let itemName = item.name + (item.description ? ` (${item.description})` : '');
    if (itemName.length > 28) itemName = itemName.slice(0, 26) + '..';
    const rowData = [
      String(idx + 1),
      itemName,
      item.hsnCode || '-',
      `${item.quantity} ${item.unit}`,
      formatCurrency(item.unitPrice),
      item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-',
      `${item.gstRate}%`,
      formatCurrency(taxAmt),
      formatCurrency(item.totalAmount),
    ];
    doc.fillColor(DARK);
    rowData.forEach((val, i) => {
      doc.text(val, colX[i], y, { width: colW[i], align: i === 0 ? 'center' : i < 3 ? 'left' : 'right' });
    });
    y += ROW_HEIGHT;
  });

  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor(BORDER).lineWidth(0.5).stroke();

  // ─── TOTALS (compact) ───
  y += 6;
  const totalsX = 380;
  const totalsValX = 500;

  const addRow = (label, value, bold = false, color = DARK) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor(color);
    doc.text(label, totalsX, y, { width: 110, align: 'right' });
    doc.text(value, totalsValX, y, { width: 60, align: 'right' });
    y += 11;
  };

  addRow('Subtotal:', formatCurrency(invoice.subtotal));
  if (Number(invoice.discountAmount) > 0) addRow('Discount:', `-${formatCurrency(invoice.discountAmount)}`, false, '#dc2626');
  if (Number(invoice.cgst) > 0) addRow('CGST:', formatCurrency(invoice.cgst));
  if (Number(invoice.sgst) > 0) addRow('SGST:', formatCurrency(invoice.sgst));
  if (Number(invoice.igst) > 0) addRow('IGST:', formatCurrency(invoice.igst));

  y += 2;
  doc.moveTo(totalsX, y).lineTo(totalsX + 165, y).strokeColor(TEAL).lineWidth(1).stroke();
  y += 4;

  drawRoundedRect(doc, totalsX - 5, y - 3, 170, 20, 4, TEAL);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
  doc.text('Grand Total:', totalsX, y, { width: 110, align: 'right' });
  doc.text(formatCurrency(invoice.totalAmount), totalsValX, y, { width: 60, align: 'right' });
  y += 22;

  doc.fontSize(6.5).font('Helvetica').fillColor(MUTED);
  doc.text(`Amount in Words: ${numberToWords(Number(invoice.totalAmount))}`, leftX, y, { width: pageWidth });
  y += 14;

  // ─── QR + BANK + TERMS ───
  if (qrImage) {
    doc.image(qrImage, leftX, y, { width: 55, fit: [55, 55] });
    doc.fontSize(5).font('Helvetica').fillColor(MUTED).text('UPI', leftX, y + 58, { width: 55, align: 'center' });
  }
  if (staticQrImage) {
    const sx = qrImage ? leftX + 65 : leftX;
    try {
      doc.image(staticQrImage.buffer, sx, y, { width: 55, fit: [55, 55] });
      doc.fontSize(5).font('Helvetica').fillColor(MUTED).text('Paytm', sx, y + 58, { width: 55, align: 'center' });
    } catch (e) {}
  }

  const notesX = (qrImage || staticQrImage) ? leftX + 140 : leftX;
  let notesY = y;

  if (invoice.notes) {
    doc.fontSize(6).font('Helvetica-Bold').fillColor(TEAL).text('Notes:', notesX, notesY);
    doc.font('Helvetica').fillColor(DARK).text(invoice.notes, notesX, notesY + 9, { width: 200 });
    notesY += 20;
  }

  if (user.bankName || user.bankAccount) {
    doc.fontSize(6).font('Helvetica-Bold').fillColor(TEAL).text('Bank:', notesX, notesY);
    notesY += 9;
    doc.fontSize(6).font('Helvetica').fillColor(DARK);
    const bankParts = [user.bankName, user.bankAccount, user.bankIfsc, user.bankBranch].filter(Boolean);
    doc.text(bankParts.join(' | '), notesX, notesY, { width: 200 });
    notesY += 10;
  }

  if (invoice.terms) {
    doc.fontSize(6).font('Helvetica-Bold').fillColor(TEAL).text('Terms:', notesX, notesY);
    doc.font('Helvetica').fillColor(DARK).text(invoice.terms, notesX, notesY + 9, { width: 200 });
  }

  // ─── SIGNATURE ───
  const sigY = pageBottom - 45;
  doc.moveTo(leftX, sigY).lineTo(leftX + 180, sigY).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.fontSize(6).font('Helvetica').fillColor(MUTED).text('Authorized Signatory', leftX, sigY + 3);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(DARK).text(user.businessName || user.name, leftX, sigY + 12);

  // ─── FOOTER ───
  doc.rect(0, pageBottom - 14, 595.28, 14).fill(TEAL);
  doc.fontSize(5.5).font('Helvetica').fillColor('#ffffff')
    .text('Generated by Bill By Billu — AI Invoice + GST for Indian Businesses', 0, pageBottom - 10, { align: 'center', width: 595.28 });
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════
const templates = { classic: classicTemplate, modern: modernTemplate, compact: compactTemplate };

function getTemplate(name) {
  return templates[name] || templates.classic;
}

module.exports = { getTemplate, templates: Object.keys(templates) };
