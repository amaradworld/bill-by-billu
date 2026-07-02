const express = require('express');
const multer = require('multer');
const prisma = require('../prisma');
const { authenticate } = require('../middlewares/auth');
const { validateGSTIN, extractStateFromGSTIN } = require('../services/gst');
const { calculateInvoiceTotals } = require('../services/gst');
const logger = require('../logger');

const router = express.Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── CSV Parser (no external lib) ───

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = false; }
      } else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

function generateCSVTemplate(headers, exampleRow) {
  const lines = [headers.join(',')];
  const values = headers.map(h => {
    const val = exampleRow[h] || '';
    return val.includes(',') || val.includes('"') || val.includes('\n')
      ? `"${val.replace(/"/g, '""')}"` : val;
  });
  lines.push(values.join(','));
  return lines.join('\n');
}

// ─── POST /api/import/customers ───

router.post('/customers', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = req.file.buffer.toString('utf-8');
    const { rows } = parseCSV(text);

    let imported = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name || row.customer_name || row.customername;
      if (!name) { errors.push(`Row ${i + 2}: Missing name`); continue; }

      const email = row.email || null;
      const phone = row.phone || row.phone_number || null;

      if (!email && !phone) { errors.push(`Row ${i + 2}: Need email or phone`); continue; }

      const existing = await prisma.customer.findFirst({
        where: {
          userId: req.userId,
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (existing) { skipped++; continue; }

      const gstNumber = row.gst_number || row.gstnumber || row.gstin || null;
      let state = row.state || null;
      if (gstNumber && !validateGSTIN(gstNumber)) {
        errors.push(`Row ${i + 2}: Invalid GSTIN "${gstNumber}"`);
        continue;
      }
      if (gstNumber && !state) state = extractStateFromGSTIN(gstNumber);

      await prisma.customer.create({
        data: {
          userId: req.userId,
          name,
          email: email || null,
          phone: phone || null,
          gstNumber: gstNumber || null,
          address: row.address || null,
          city: row.city || null,
          state,
          pincode: row.pincode || row.pin_code || null,
          type: gstNumber ? 'B2B' : (row.type || 'B2C'),
        },
      });
      imported++;
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    logger.error('Import customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/import/products ───

router.post('/products', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = req.file.buffer.toString('utf-8');
    const { rows } = parseCSV(text);

    let imported = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name || row.product_name || row.productname;
      if (!name) { errors.push(`Row ${i + 2}: Missing name`); continue; }

      const sku = row.sku || row.item_code || row.itemcode || null;

      if (sku) {
        const existing = await prisma.product.findFirst({
          where: { userId: req.userId, name: sku },
        });
        if (existing) { skipped++; continue; }
      }

      const unitPrice = parseFloat(row.price || row.unit_price || row.unitprice || row.rate || '0');
      if (!unitPrice || unitPrice <= 0) { errors.push(`Row ${i + 2}: Invalid price`); continue; }

      await prisma.product.create({
        data: {
          userId: req.userId,
          name,
          hsnCode: row.hsn_code || row.hsncode || row.hsn || null,
          unitPrice,
          gstRate: parseFloat(row.gst_rate || row.gstrate || row.gst || '18'),
          unit: row.unit || 'NOS',
          category: row.category || null,
        },
      });
      imported++;
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    logger.error('Import products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/import/invoices ───

router.post('/invoices', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = req.file.buffer.toString('utf-8');
    const { rows } = parseCSV(text);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let imported = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const invoiceNumber = row.invoice_number || row.invoicenumber || row.invoice_no;
      if (!invoiceNumber) { errors.push(`Row ${i + 2}: Missing invoice number`); continue; }

      const existing = await prisma.invoice.findFirst({
        where: { userId: req.userId, invoiceNumber },
      });
      if (existing) { skipped++; continue; }

      // Find or create customer
      let customerId = null;
      const customerEmail = row.customer_email || row.email || null;
      const customerName = row.customer_name || row.customername || row.name || 'Walk-in Customer';

      if (customerEmail) {
        const customer = await prisma.customer.findFirst({
          where: { userId: req.userId, email: customerEmail },
        });
        if (customer) customerId = customer.id;
      }

      if (!customerId) {
        const customer = await prisma.customer.create({
          data: {
            userId: req.userId,
            name: customerName,
            email: customerEmail,
            phone: row.customer_phone || row.phone || null,
            gstNumber: row.customer_gst || row.gst_number || null,
            type: (row.customer_gst || row.gst_number) ? 'B2B' : 'B2C',
          },
        });
        customerId = customer.id;
      }

      // Parse items
      let items = [];
      try {
        items = JSON.parse(row.items || row.line_items || '[]');
      } catch {
        // Try single-item format
        const itemName = row.item_name || row.product_name || null;
        if (itemName) {
          items = [{
            name: itemName,
            quantity: parseFloat(row.quantity || row.qty || '1'),
            unitPrice: parseFloat(row.unit_price || row.rate || row.price || '0'),
            gstRate: parseFloat(row.gst_rate || row.gstrate || '18'),
            unit: row.unit || 'NOS',
          }];
        }
      }

      if (!items.length) { errors.push(`Row ${i + 2}: No items found`); continue; }

      const invoiceDate = row.invoice_date || row.date || new Date().toISOString().split('T')[0];

      const totals = calculateInvoiceTotals({
        items,
        supplierState: user.state,
        customerState: row.customer_state || null,
        discount: parseFloat(row.discount || '0'),
        reverseCharge: false,
      });

      try {
        await prisma.invoice.create({
          data: {
            userId: req.userId,
            customerId,
            invoiceNumber,
            invoiceDate: new Date(invoiceDate),
            status: 'DRAFT',
            supplierName: user.businessName || user.name,
            supplierGst: user.gstNumber,
            supplierAddress: [user.address, user.city, user.state, user.pincode].filter(Boolean).join(', '),
            supplierState: user.state,
            customerName,
            customerGst: row.customer_gst || null,
            customerState: row.customer_state || null,
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            cgst: totals.cgst,
            sgst: totals.sgst,
            igst: totals.igst,
            totalTax: totals.totalTax,
            totalAmount: totals.totalAmount,
            paymentStatus: (row.payment_status || 'UNPAID').toUpperCase(),
            notes: row.notes || 'Thank you for your business!',
            terms: row.terms || 'Payment due within 30 days',
            placeOfSupply: row.place_of_supply || row.customer_state || user.state,
            reverseCharge: false,
            currency: user.currency || 'INR',
            exchangeRate: 1,
            isDraft: true,
            items: {
              create: items.map((item, idx) => ({
                name: item.name,
                hsnCode: item.hsnCode || null,
                unit: item.unit || 'NOS',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                gstRate: item.gstRate || 18,
                cgst: totals.items[idx]?.cgst || 0,
                sgst: totals.items[idx]?.sgst || 0,
                igst: totals.items[idx]?.igst || 0,
                totalAmount: totals.items[idx]?.totalAmount || 0,
              })),
            },
          },
        });
        imported++;
      } catch (createErr) {
        if (createErr.code === 'P2002') { skipped++; continue; }
        errors.push(`Row ${i + 2}: ${createErr.message}`);
      }
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    logger.error('Import invoices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/import/template/:type ───

router.get('/template/:type', (req, res) => {
  const { type } = req.params;

  const templates = {
    customers: {
      headers: ['name', 'email', 'phone', 'gst_number', 'address', 'city', 'state', 'pincode', 'type'],
      example: { name: 'Acme Corp', email: 'info@acme.com', phone: '9876543210', gst_number: '27AABCU9603R1ZM', address: '123 Business Park', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', type: 'B2B' },
    },
    products: {
      headers: ['name', 'sku', 'hsn_code', 'price', 'gst_rate', 'unit', 'category'],
      example: { name: 'Web Development Service', sku: 'SVC-WEB-001', hsn_code: '998314', price: '15000', gst_rate: '18', unit: 'NOS', category: 'Services' },
    },
    invoices: {
      headers: ['invoice_number', 'customer_name', 'customer_email', 'invoice_date', 'items', 'total_amount', 'tax_amount', 'grand_total', 'payment_status'],
      example: { invoice_number: 'INV-0001', customer_name: 'Acme Corp', customer_email: 'info@acme.com', invoice_date: '2026-04-01', items: '[{"name":"Web Design","quantity":1,"unitPrice":50000,"gstRate":18}]', total_amount: '50000', tax_amount: '9000', grand_total: '59000', payment_status: 'UNPAID' },
    },
  };

  const tmpl = templates[type];
  if (!tmpl) return res.status(400).json({ error: 'Invalid type. Use: customers, products, invoices' });

  const csv = generateCSVTemplate(tmpl.headers, tmpl.example);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
  res.send(csv);
});

// ─── POST /api/import/tally ───

router.post('/tally', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = req.file.buffer.toString('utf-8');
    let imported = 0, skipped = 0;
    const errors = [];

    // Simple XML parsing — extract ledger names as customers, stock items as products
    const ledgerMatches = text.match(/<LEDGER[^>]*>[\s\S]*?<NAME>([^<]+)<\/NAME>[\s\S]*?<\/LEDGER>/gi) || [];
    const stockMatches = text.match(/<STOCKITEM[^>]*>[\s\S]*?<NAME>([^<]+)<\/NAME>[\s\S]*?<\/STOCKITEM>/gi) || [];

    for (const match of ledgerMatches) {
      const nameMatch = match.match(/<NAME>([^<]+)<\/NAME>/i);
      if (!nameMatch) continue;
      const name = nameMatch[1].trim();
      if (!name || name.startsWith('_')) continue;

      const existing = await prisma.customer.findFirst({
        where: { userId: req.userId, name },
      });
      if (existing) { skipped++; continue; }

      await prisma.customer.create({
        data: { userId: req.userId, name, type: 'B2C' },
      });
      imported++;
    }

    for (const match of stockMatches) {
      const nameMatch = match.match(/<NAME>(([^<]+))<\/NAME>/i);
      if (!nameMatch) continue;
      const name = nameMatch[1].trim();
      if (!name || name.startsWith('_')) continue;

      const existing = await prisma.product.findFirst({
        where: { userId: req.userId, name },
      });
      if (existing) { skipped++; continue; }

      const rateMatch = match.match(/<RATE>([^<]+)<\/RATE>/i);
      const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;

      await prisma.product.create({
        data: {
          userId: req.userId,
          name,
          unitPrice: rate > 0 ? rate : 0,
          gstRate: 18,
          unit: 'NOS',
        },
      });
      imported++;
    }

    if (imported === 0 && ledgerMatches.length === 0 && stockMatches.length === 0) {
      errors.push('No Tally data found. Ensure XML contains <LEDGER> or <STOCKITEM> tags.');
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    logger.error('Import Tally error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/import/zoho ───

router.post('/zoho', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = req.file.buffer.toString('utf-8');
    const { rows } = parseCSV(text);

    let imported = 0, skipped = 0;
    const errors = [];

    // Zoho CSV column mapping
    const zohoColumnMap = {
      name: ['customer name', 'contact name', 'display name', 'name', 'party name'],
      email: ['email', 'email id', 'customer email'],
      phone: ['phone', 'mobile', 'phone number', 'mobile number'],
      gst_number: ['gstin', 'gst number', 'gst no', 'tax registration number'],
      address: ['address', 'street', 'address 1'],
      city: ['city', 'delivery city'],
      state: ['state', 'delivery state'],
      pincode: ['pincode', 'pin code', 'zip', 'zip code', 'postal code'],
    };

    function findColumn(row, possibleNames) {
      for (const key of Object.keys(row)) {
        const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const name of possibleNames) {
          if (normalized === name.replace(/[^a-z0-9]/g, '')) return row[key];
        }
      }
      return null;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = findColumn(row, zohoColumnMap.name);
      if (!name) { errors.push(`Row ${i + 2}: Missing name`); continue; }

      const email = findColumn(row, zohoColumnMap.email);
      const phone = findColumn(row, zohoColumnMap.phone);

      if (!email && !phone) { errors.push(`Row ${i + 2}: Need email or phone`); continue; }

      const existing = await prisma.customer.findFirst({
        where: {
          userId: req.userId,
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });
      if (existing) { skipped++; continue; }

      const gstNumber = findColumn(row, zohoColumnMap.gst_number);
      let state = findColumn(row, zohoColumnMap.state);
      if (gstNumber && !validateGSTIN(gstNumber)) {
        errors.push(`Row ${i + 2}: Invalid GSTIN "${gstNumber}"`);
        continue;
      }
      if (gstNumber && !state) state = extractStateFromGSTIN(gstNumber);

      await prisma.customer.create({
        data: {
          userId: req.userId,
          name,
          email: email || null,
          phone: phone || null,
          gstNumber: gstNumber || null,
          address: findColumn(row, zohoColumnMap.address) || null,
          city: findColumn(row, zohoColumnMap.city) || null,
          state,
          pincode: findColumn(row, zohoColumnMap.pincode) || null,
          type: gstNumber ? 'B2B' : 'B2C',
        },
      });
      imported++;
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    logger.error('Import Zoho error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
