const prisma = require('../prisma');

// ============================================================
// BILL BY BILLU — AI ENGINE (No external API required)
// Local NLP parser, product suggestions, HSN/GST classifier,
// business queries, payment reminders, WhatsApp parsing, OCR
// ============================================================

// --- HSN Code Database (common Indian products) ---
const HSN_DATABASE = {
  // Apparel & Textiles
  'shirt': { hsn: '6205', gst: 5, category: 'Apparel' },
  't-shirt': { hsn: '6109', gst: 5, category: 'Apparel' },
  'tshirt': { hsn: '6109', gst: 5, category: 'Apparel' },
  't shirt': { hsn: '6109', gst: 5, category: 'Apparel' },
  'jeans': { hsn: '6203', gst: 5, category: 'Apparel' },
  'trouser': { hsn: '6203', gst: 5, category: 'Apparel' },
  'trousers': { hsn: '6203', gst: 5, category: 'Apparel' },
  'pant': { hsn: '6203', gst: 5, category: 'Apparel' },
  'pants': { hsn: '6203', gst: 5, category: 'Apparel' },
  'kurta': { hsn: '6211', gst: 5, category: 'Apparel' },
  'kurti': { hsn: '6211', gst: 5, category: 'Apparel' },
  'saree': { hsn: '5208', gst: 5, category: 'Apparel' },
  'sari': { hsn: '5208', gst: 5, category: 'Apparel' },
  'dress': { hsn: '6204', gst: 5, category: 'Apparel' },
  'suit': { hsn: '6203', gst: 12, category: 'Apparel' },
  'blazer': { hsn: '6203', gst: 12, category: 'Apparel' },
  'jacket': { hsn: '6201', gst: 12, category: 'Apparel' },
  'coat': { hsn: '6201', gst: 12, category: 'Apparel' },
  'shorts': { hsn: '6203', gst: 5, category: 'Apparel' },
  'skirt': { hsn: '6204', gst: 5, category: 'Apparel' },
  'sweater': { hsn: '6110', gst: 5, category: 'Apparel' },
  'hoodie': { hsn: '6110', gst: 5, category: 'Apparel' },
  'cap': { hsn: '6505', gst: 12, category: 'Apparel' },
  'hat': { hsn: '6505', gst: 12, category: 'Apparel' },
  'socks': { hsn: '6115', gst: 5, category: 'Apparel' },
  'underwear': { hsn: '6107', gst: 5, category: 'Apparel' },
  'inner': { hsn: '6107', gst: 5, category: 'Apparel' },
  'vest': { hsn: '6107', gst: 5, category: 'Apparel' },
  'baniyan': { hsn: '6107', gst: 5, category: 'Apparel' },
  'lungi': { hsn: '6207', gst: 5, category: 'Apparel' },
  'dhoti': { hsn: '6207', gst: 5, category: 'Apparel' },

  // Footwear
  'shoe': { hsn: '6403', gst: 18, category: 'Footwear' },
  'shoes': { hsn: '6403', gst: 18, category: 'Footwear' },
  'sandal': { hsn: '6403', gst: 18, category: 'Footwear' },
  'slipper': { hsn: '6404', gst: 18, category: 'Footwear' },
  'sneaker': { hsn: '6404', gst: 18, category: 'Footwear' },
  'sneakers': { hsn: '6404', gst: 18, category: 'Footwear' },
  'boot': { hsn: '6403', gst: 18, category: 'Footwear' },
  'boots': { hsn: '6403', gst: 18, category: 'Footwear' },
  'chappal': { hsn: '6403', gst: 18, category: 'Footwear' },
  'floaters': { hsn: '6404', gst: 18, category: 'Footwear' },

  // Accessories
  'belt': { hsn: '4203', gst: 18, category: 'Accessories' },
  'wallet': { hsn: '4202', gst: 18, category: 'Accessories' },
  'bag': { hsn: '4202', gst: 18, category: 'Accessories' },
  'handbag': { hsn: '4202', gst: 18, category: 'Accessories' },
  'backpack': { hsn: '4202', gst: 18, category: 'Accessories' },
  'watch': { hsn: '9102', gst: 18, category: 'Accessories' },
  'sunglasses': { hsn: '9004', gst: 18, category: 'Accessories' },
  'glasses': { hsn: '9004', gst: 18, category: 'Accessories' },
  'tie': { hsn: '6215', gst: 18, category: 'Accessories' },
  'scarf': { hsn: '6214', gst: 12, category: 'Accessories' },
  'muffler': { hsn: '6214', gst: 12, category: 'Accessories' },
  'gloves': { hsn: '6216', gst: 12, category: 'Accessories' },
  'jewellery': { hsn: '7113', gst: 3, category: 'Accessories' },
  'jewelry': { hsn: '7113', gst: 3, category: 'Accessories' },
  'ring': { hsn: '7113', gst: 3, category: 'Accessories' },
  'necklace': { hsn: '7113', gst: 3, category: 'Accessories' },
  'earring': { hsn: '7113', gst: 3, category: 'Accessories' },
  'bracelet': { hsn: '7113', gst: 3, category: 'Accessories' },

  // Electronics
  'laptop': { hsn: '8471', gst: 18, category: 'Electronics' },
  'computer': { hsn: '8471', gst: 18, category: 'Electronics' },
  'phone': { hsn: '8517', gst: 18, category: 'Electronics' },
  'mobile': { hsn: '8517', gst: 18, category: 'Electronics' },
  'tablet': { hsn: '8471', gst: 18, category: 'Electronics' },
  'headphone': { hsn: '8518', gst: 18, category: 'Electronics' },
  'earphone': { hsn: '8518', gst: 18, category: 'Electronics' },
  'charger': { hsn: '8504', gst: 18, category: 'Electronics' },
  'cable': { hsn: '8544', gst: 18, category: 'Electronics' },
  'mouse': { hsn: '8471', gst: 18, category: 'Electronics' },
  'keyboard': { hsn: '8471', gst: 18, category: 'Electronics' },
  'monitor': { hsn: '8528', gst: 18, category: 'Electronics' },
  'printer': { hsn: '8443', gst: 18, category: 'Electronics' },
  'camera': { hsn: '9006', gst: 18, category: 'Electronics' },
  'speaker': { hsn: '8518', gst: 18, category: 'Electronics' },
  'television': { hsn: '8528', gst: 18, category: 'Electronics' },
  'tv': { hsn: '8528', gst: 18, category: 'Electronics' },
  'fan': { hsn: '8414', gst: 18, category: 'Electronics' },
  'bulb': { hsn: '9405', gst: 18, category: 'Electronics' },
  'light': { hsn: '9405', gst: 18, category: 'Electronics' },

  // Food & Beverages
  'rice': { hsn: '1006', gst: 0, category: 'Food' },
  'wheat': { hsn: '1001', gst: 0, category: 'Food' },
  'sugar': { hsn: '1701', gst: 5, category: 'Food' },
  'oil': { hsn: '1509', gst: 5, category: 'Food' },
  'tea': { hsn: '0902', gst: 5, category: 'Food' },
  'coffee': { hsn: '0901', gst: 5, category: 'Food' },
  'milk': { hsn: '0401', gst: 0, category: 'Food' },
  'bread': { hsn: '1905', gst: 0, category: 'Food' },
  'biscuit': { hsn: '1905', gst: 18, category: 'Food' },
  'chocolate': { hsn: '1806', gst: 28, category: 'Food' },
  'snack': { hsn: '1905', gst: 18, category: 'Food' },
  'namkeen': { hsn: '1905', gst: 5, category: 'Food' },
  'spice': { hsn: '0910', gst: 5, category: 'Food' },
  'masala': { hsn: '0910', gst: 5, category: 'Food' },

  // Home & Kitchen
  'plate': { hsn: '6911', gst: 18, category: 'Home' },
  'cup': { hsn: '6912', gst: 18, category: 'Home' },
  'glass': { hsn: '7013', gst: 18, category: 'Home' },
  'bottle': { hsn: '3924', gst: 18, category: 'Home' },
  'container': { hsn: '3924', gst: 18, category: 'Home' },
  'bucket': { hsn: '3924', gst: 18, category: 'Home' },
  'mug': { hsn: '6912', gst: 18, category: 'Home' },
  'knife': { hsn: '8211', gst: 18, category: 'Home' },
  'pan': { hsn: '7323', gst: 18, category: 'Home' },
  'pot': { hsn: '7323', gst: 18, category: 'Home' },
  'towel': { hsn: '6302', gst: 12, category: 'Home' },
  'bedsheet': { hsn: '6302', gst: 12, category: 'Home' },
  'pillow': { hsn: '9404', gst: 18, category: 'Home' },
  'curtain': { hsn: '6303', gst: 18, category: 'Home' },
  'sofa': { hsn: '9401', gst: 18, category: 'Home' },
  'chair': { hsn: '9401', gst: 18, category: 'Home' },
  'table': { hsn: '9403', gst: 18, category: 'Home' },
  'shelf': { hsn: '9403', gst: 18, category: 'Home' },
  'cupboard': { hsn: '9403', gst: 18, category: 'Home' },
  'almirah': { hsn: '9403', gst: 18, category: 'Home' },

  // Beauty & Personal Care
  'soap': { hsn: '3401', gst: 18, category: 'Beauty' },
  'shampoo': { hsn: '3305', gst: 18, category: 'Beauty' },
  'cream': { hsn: '3304', gst: 28, category: 'Beauty' },
  'lotion': { hsn: '3304', gst: 28, category: 'Beauty' },
  'perfume': { hsn: '3303', gst: 28, category: 'Beauty' },
  'deodorant': { hsn: '3303', gst: 28, category: 'Beauty' },
  'toothpaste': { hsn: '3306', gst: 18, category: 'Beauty' },
  'toothbrush': { hsn: '9603', gst: 18, category: 'Beauty' },

  // Stationery
  'pen': { hsn: '9608', gst: 18, category: 'Stationery' },
  'pencil': { hsn: '9609', gst: 18, category: 'Stationery' },
  'notebook': { hsn: '4820', gst: 12, category: 'Stationery' },
  'paper': { hsn: '4819', gst: 12, category: 'Stationery' },
  'envelope': { hsn: '4817', gst: 12, category: 'Stationery' },
  'file': { hsn: '4820', gst: 12, category: 'Stationery' },
  'folder': { hsn: '4820', gst: 12, category: 'Stationery' },
  'tape': { hsn: '3919', gst: 18, category: 'Stationery' },
  'stapler': { hsn: '8472', gst: 18, category: 'Stationery' },

  // Auto Parts
  'tyre': { hsn: '4011', gst: 28, category: 'Auto' },
  'tire': { hsn: '4011', gst: 28, category: 'Auto' },
  'battery': { hsn: '8507', gst: 28, category: 'Auto' },
  'oil filter': { hsn: '8421', gst: 28, category: 'Auto' },
  'brake pad': { hsn: '6813', gst: 28, category: 'Auto' },

  // Construction & Building
  'cement': { hsn: '2523', gst: 28, category: 'Building' },
  'steel': { hsn: '7213', gst: 18, category: 'Building' },
  'iron': { hsn: '7213', gst: 18, category: 'Building' },
  'tile': { hsn: '6907', gst: 18, category: 'Building' },
  'brick': { hsn: '6901', gst: 28, category: 'Building' },
  'paint': { hsn: '3208', gst: 28, category: 'Building' },
  'plywood': { hsn: '4412', gst: 18, category: 'Building' },

  // Medicines & Pharma
  'medicine': { hsn: '3004', gst: 12, category: 'Pharma' },
  'tablet': { hsn: '3004', gst: 12, category: 'Pharma' },
  'syrup': { hsn: '3004', gst: 12, category: 'Pharma' },
  'injection': { hsn: '3004', gst: 12, category: 'Pharma' },
  'capsule': { hsn: '3004', gst: 12, category: 'Pharma' },

  // Sports
  'cricket bat': { hsn: '9506', gst: 12, category: 'Sports' },
  'cricket ball': { hsn: '9506', gst: 12, category: 'Sports' },
  'football': { hsn: '9506', gst: 12, category: 'Sports' },
  'basketball': { hsn: '9506', gst: 12, category: 'Sports' },
  'yoga mat': { hsn: '9506', gst: 18, category: 'Sports' },
  'dumbbell': { hsn: '9506', gst: 18, category: 'Sports' },
};

// --- Product Suggestion Templates ---
const SUGGESTION_TEMPLATES = {
  'formal outfit': ['Shirt', 'Trouser', 'Belt', 'Formal Shoes', 'Tie'],
  'casual outfit': ['T-Shirt', 'Jeans', 'Sneakers', 'Belt'],
  'wedding outfit': ['Kurta', 'Sherwani', 'Saree', 'Jewellery', 'Sandal'],
  'business outfit': ['Blazer', 'Formal Shirt', 'Trouser', 'Formal Shoes', 'Watch'],
  'gym outfit': ['T-Shirt', 'Shorts', 'Sneakers', 'Socks', 'Water Bottle'],
  'summer outfit': ['Cotton Shirt', 'Shorts', 'Sandals', 'Sunglasses', 'Hat'],
  'winter outfit': ['Jacket', 'Sweater', 'Jeans', 'Boots', 'Scarf', 'Gloves'],
  'party outfit': ['Shirt', 'Jeans', 'Sneakers', 'Watch', 'Perfume'],
  'office supplies': ['Notebook', 'Pen', 'File Folder', 'Stapler', 'Tape'],
  'kitchen essentials': ['Pan', 'Pot', 'Knife', 'Plates', 'Glasses', 'Cups'],
  'home decor': ['Curtain', 'Bedsheet', 'Pillow', 'Towel', 'Light'],
  'new baby': ['Diapers', 'Baby Soap', 'Baby Powder', 'Baby Clothes', 'Blanket'],
  'travel kit': ['Backpack', 'Bottle', 'Travel Pouch', 'Power Bank', 'Headphone'],
  'gift set': ['Watch', 'Wallet', 'Perfume', 'Belt', 'Sunglasses'],
  'school kit': ['Backpack', 'Notebook', 'Pencil Box', 'Water Bottle', 'Lunch Box'],
};

// --- Number word to digit conversion ---
const WORD_TO_NUM = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
};

// ============================================================
// 1. NATURAL LANGUAGE PARSER — "Create an invoice for..."
// ============================================================
function parseInvoiceCommand(text) {
  const result = {
    customerName: null,
    items: [],
    rawText: text,
  };

  const lower = text.toLowerCase().trim();

  // Extract customer name
  const customerPatterns = [
    /(?:for|to|bill)\s+(?:m(?:r|rs|s)?\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /(?:for|to|bill)\s+(?:m(?:r|rs|s)?\.?\s+)?([a-z]+(?:\s+[a-z]+)*)/,
    /([A-Z][a-z]+(?:\s+(?:Traders|Enterprises|Stores|Shop|Agency|Company|Corporation|Ltd|Pvt|And Sons|Brothers|Exports|Imports|Trading|Solutions|Services|Private Limited|LLP)))/,
  ];

  for (const pattern of customerPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.customerName = match[1].trim();
      break;
    }
  }

  // Extract items: patterns like "10 T-shirts at 450 each", "5 jeans @1200"
  const itemPatterns = [
    /(\d+)\s+(.+?)\s+(?:at|@|for|×|x)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:each|per\s+piece|per\s+item|each\s+)?/gi,
    /(\d+)\s+(.+?)\s+(?:₹|rs\.?|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(\d+)\s+(.+?)(?:\s*$)/gi,
  ];

  for (const pattern of itemPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const qty = parseInt(match[1]);
      const rawName = match[2].trim();
      const name = rawName
        .replace(/\s+(?:at|@|for|×|x)\s*.*$/i, '')
        .replace(/\s+(?:at|@|for|×|x)$/i, '')
        .trim();
      const price = match[3] ? parseFloat(match[3].replace(/,/g, '')) : null;

      if (name && qty > 0 && !result.items.find(i => i.name.toLowerCase() === name.toLowerCase())) {
        const hsnInfo = lookupHSN(name);
        result.items.push({
          name: hsnInfo.normalizedName || name,
          quantity: qty,
          unitPrice: price,
          hsnCode: hsnInfo.hsn,
          gstRate: hsnInfo.gst,
          unit: hsnInfo.unit || 'NOS',
        });
      }
    }
  }

  return result;
}

// ============================================================
// 2. WHATSAPP MESSAGE PARSER
// ============================================================
function parseWhatsAppMessage(text) {
  return parseInvoiceCommand(text);
}

// ============================================================
// 3. OCR TEXT PARSER (from image)
// ============================================================
function parseOCRText(text) {
  const parsed = parseInvoiceCommand(text);

  // Try to extract more structured data from OCR output
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Try to find price patterns: ₹450, Rs.450, 450/-
    const priceMatch = line.match(/(?:₹|rs\.?|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    // Try to find quantity patterns
    const qtyMatch = line.match(/^(\d+)\s+(.+)$/);

    if (qtyMatch && priceMatch && !parsed.items.find(i =>
      i.name.toLowerCase() === qtyMatch[2].trim().toLowerCase()
    )) {
      const qty = parseInt(qtyMatch[1]);
      const name = qtyMatch[2].trim();
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      const hsnInfo = lookupHSN(name);
      parsed.items.push({
        name: hsnInfo.normalizedName || name,
        quantity: qty,
        unitPrice: price,
        hsnCode: hsnInfo.hsn,
        gstRate: hsnInfo.gst,
        unit: hsnInfo.unit || 'NOS',
      });
    }
  }

  return parsed;
}

// ============================================================
// 4. HSN/GST LOOKUP
// ============================================================
function lookupHSN(productName) {
  const lower = productName.toLowerCase().trim();

  // Direct match
  if (HSN_DATABASE[lower]) {
    return { ...HSN_DATABASE[lower], normalized: true, normalizedName: productName };
  }

  // Partial match
  for (const [key, value] of Object.entries(HSN_DATABASE)) {
    if (lower.includes(key) || key.includes(lower)) {
      return { ...value, normalizedName: productName };
    }
  }

  // Default: 18% GST, no HSN
  return { hsn: '', gst: 18, category: 'General', unit: 'NOS', normalizedName: productName };
}

// ============================================================
// 5. PRODUCT SUGGESTIONS
// ============================================================
function suggestProducts(description) {
  const lower = description.toLowerCase().trim();
  const suggestions = [];

  // Check suggestion templates
  for (const [key, items] of Object.entries(SUGGESTION_TEMPLATES)) {
    if (lower.includes(key) || key.split(' ').some(w => lower.includes(w))) {
      suggestions.push(...items);
    }
  }

  // Gender-based suggestions
  if (lower.includes('men') || lower.includes('boy') || lower.includes('male') || lower.includes('gentleman')) {
    if (lower.includes('formal') || lower.includes('office') || lower.includes('business')) {
      suggestions.push('Formal Shirt', 'Trouser', 'Belt', 'Formal Shoes', 'Tie');
    }
    if (lower.includes('casual') || lower.includes('everyday')) {
      suggestions.push('T-Shirt', 'Jeans', 'Sneakers', 'Belt', 'Watch');
    }
    if (lower.includes('wedding') || lower.includes('party') || lower.includes('festive')) {
      suggestions.push('Kurta Pajama', 'Sherwani', 'Sandal', 'Watch');
    }
  }

  if (lower.includes('women') || lower.includes('girl') || lower.includes('female') || lower.includes('lady')) {
    if (lower.includes('formal') || lower.includes('office')) {
      suggestions.push('Formal Shirt', 'Trousers', 'Heels', 'Handbag');
    }
    if (lower.includes('casual') || lower.includes('everyday')) {
      suggestions.push('Kurti', 'Jeans', 'Sneakers', 'Watch');
    }
    if (lower.includes('wedding') || lower.includes('party') || lower.includes('festive')) {
      suggestions.push('Saree', 'Jewellery', 'Heels', 'Handbag');
    }
    if (lower.includes('traditional') || lower.includes('ethnic')) {
      suggestions.push('Saree', 'Kurti', 'Dupatta', 'Jewellery', 'Sandals');
    }
  }

  // Season-based
  if (lower.includes('summer') || lower.includes('hot')) {
    suggestions.push('Cotton Shirt', 'Shorts', 'Sandals', 'Sunglasses');
  }
  if (lower.includes('winter') || lower.includes('cold')) {
    suggestions.push('Jacket', 'Sweater', 'Jeans', 'Boots', 'Scarf');
  }

  // Activity-based
  if (lower.includes('gym') || lower.includes('workout') || lower.includes('fitness')) {
    suggestions.push('Gym T-Shirt', 'Shorts', 'Sneakers', 'Water Bottle');
  }
  if (lower.includes('travel') || lower.includes('trip')) {
    suggestions.push('Backpack', 'Bottle', 'Power Bank', 'Headphone');
  }
  if (lower.includes('school') || lower.includes('college') || lower.includes('student')) {
    suggestions.push('Backpack', 'Notebook', 'Pencil Box', 'Water Bottle');
  }
  if (lower.includes('baby') || lower.includes('infant') || lower.includes('newborn')) {
    suggestions.push('Diapers', 'Baby Soap', 'Baby Clothes', 'Blanket');
  }

  // Deduplicate
  return [...new Set(suggestions)];
}

// ============================================================
// 6. BUSINESS INSIGHT QUERIES
// ============================================================
async function queryBusinessData(userId, query) {
  const lower = query.toLowerCase().trim();
  const result = { answer: '', data: null };

  // "which customers haven't paid" / "unpaid invoices" / "pending payments"
  if (lower.includes('unpaid') || lower.includes('haven') || lower.includes('pending') ||
      lower.includes('overdue') || lower.includes('outstanding') || lower.includes('due')) {
    const unpaid = await prisma.invoice.findMany({
      where: { userId, paymentStatus: 'UNPAID', isCancelled: false },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { invoiceDate: 'desc' },
    });

    if (unpaid.length === 0) {
      result.answer = 'No pending payments. All invoices are paid!';
    } else {
      const total = unpaid.reduce((s, i) => s + Number(i.totalAmount), 0);
      const list = unpaid.slice(0, 10).map(i =>
        `• ${i.invoiceNumber} — ${i.customerName || i.customer?.name || 'Walk-in'} — ₹${Number(i.totalAmount).toLocaleString('en-IN')}`
      ).join('\n');
      result.answer = `${unpaid.length} unpaid invoice(s) totalling ₹${total.toLocaleString('en-IN')}:\n\n${list}`;
    }
    result.data = unpaid;
    return result;
  }

  // "today's sales" / "today revenue"
  if (lower.includes('today') || lower.includes('aaj')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayInvoices = await prisma.invoice.aggregate({
      where: {
        userId,
        invoiceDate: { gte: today, lt: tomorrow },
        isCancelled: false,
      },
      _sum: { totalAmount: true, totalTax: true },
      _count: true,
    });

    const count = todayInvoices._count;
    const revenue = Number(todayInvoices._sum.totalAmount || 0);
    result.answer = count > 0
      ? `Today: ${count} invoice(s), revenue ₹${revenue.toLocaleString('en-IN')}`
      : 'No invoices today yet.';
    result.data = { count, revenue };
    return result;
  }

  // "this week" / "week"
  if (lower.includes('week')) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekData = await prisma.invoice.aggregate({
      where: {
        userId,
        invoiceDate: { gte: weekAgo },
        isCancelled: false,
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    const count = weekData._count;
    const revenue = Number(weekData._sum.totalAmount || 0);
    result.answer = `This week: ${count} invoice(s), ₹${revenue.toLocaleString('en-IN')} revenue`;
    result.data = { count, revenue };
    return result;
  }

  // "this month" / "month"
  if (lower.includes('month') || lower.includes('mahina')) {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthData = await prisma.invoice.aggregate({
      where: {
        userId,
        invoiceDate: { gte: thisMonth },
        isCancelled: false,
      },
      _sum: { totalAmount: true, totalTax: true },
      _count: true,
    });

    result.answer = `This month: ${monthData._count} invoice(s), ₹${Number(monthData._sum.totalAmount || 0).toLocaleString('en-IN')} revenue, ₹${Number(monthData._sum.totalTax || 0).toLocaleString('en-IN')} tax`;
    result.data = { count: monthData._count, revenue: Number(monthData._sum.totalAmount || 0) };
    return result;
  }

  // "top selling" / "best selling" / "most sold"
  if (lower.includes('top') || lower.includes('best') || lower.includes('most sold') ||
      lower.includes('popular') || lower.includes('favourite') || lower.includes('favorite')) {
    const items = await prisma.invoiceItem.groupBy({
      by: ['name'],
      where: { invoice: { userId, isCancelled: false } },
      _sum: { quantity: true, totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    });

    if (items.length === 0) {
      result.answer = 'No product data yet. Create some invoices first!';
    } else {
      const list = items.map((i, idx) =>
        `${idx + 1}. ${i.name} — ₹${Number(i._sum.totalAmount || 0).toLocaleString('en-IN')} (${i._sum.quantity || 0} units)`
      ).join('\n');
      result.answer = `Top selling products:\n\n${list}`;
    }
    result.data = items;
    return result;
  }

  // "low stock" / "out of stock" / "reorder"
  if (lower.includes('low stock') || lower.includes('reorder') || lower.includes('out of stock')) {
    const products = await prisma.product.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Find products that haven't been sold much
    const soldItems = await prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { userId, isCancelled: false }, productId: { not: null } },
      _sum: { quantity: true },
    });

    const soldMap = {};
    soldItems.forEach(s => { soldMap[s.productId] = Number(s._sum.quantity || 0); });

    const lowStock = products
      .map(p => ({ ...p, sold: soldMap[p.id] || 0 }))
      .sort((a, b) => a.sold - b.sold)
      .slice(0, 10);

    if (lowStock.length === 0) {
      result.answer = 'No products found. Add products to track inventory.';
    } else {
      const list = lowStock.map(p =>
        `• ${p.name} — ${p.sold} sold`
      ).join('\n');
      result.answer = `Products that may need restocking:\n\n${list}`;
    }
    result.data = lowStock;
    return result;
  }

  // "which customer buys" / "top customer" / "best customer"
  if (lower.includes('customer') && (lower.includes('buy') || lower.includes('top') ||
      lower.includes('best') || lower.includes('most'))) {
    const topCustomers = await prisma.invoice.groupBy({
      by: ['customerName'],
      where: { userId, isCancelled: false },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    });

    if (topCustomers.length === 0) {
      result.answer = 'No customer data yet. Create some invoices first!';
    } else {
      const list = topCustomers.map((c, idx) =>
        `${idx + 1}. ${c.customerName || 'Walk-in'} — ₹${Number(c._sum.totalAmount || 0).toLocaleString('en-IN')} (${c._count} invoices)`
      ).join('\n');
      result.answer = `Top customers:\n\n${list}`;
    }
    result.data = topCustomers;
    return result;
  }

  // "why sales down" / "sales comparison"
  if (lower.includes('sales') && (lower.includes('down') || lower.includes('compare') ||
      lower.includes('why') || lower.includes('trend'))) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthData, lastMonthData] = await Promise.all([
      prisma.invoice.aggregate({
        where: { userId, invoiceDate: { gte: thisMonth }, isCancelled: false },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: { userId, invoiceDate: { gte: lastMonth, lt: thisMonth }, isCancelled: false },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    const thisRev = Number(thisMonthData._sum.totalAmount || 0);
    const lastRev = Number(lastMonthData._sum.totalAmount || 0);
    const change = lastRev > 0 ? ((thisRev - lastRev) / lastRev * 100).toFixed(1) : 0;

    result.answer = `This month: ₹${thisRev.toLocaleString('en-IN')} (${thisMonthData._count} invoices)\nLast month: ₹${lastRev.toLocaleString('en-IN')} (${lastMonthData._count} invoices)\nChange: ${change >= 0 ? '+' : ''}${change}%`;
    result.data = { thisMonth: thisRev, lastMonth: lastRev, change: Number(change) };
    return result;
  }

  // "total revenue" / "total sales" / "overall"
  if (lower.includes('total') || lower.includes('overall') || lower.includes('all time') || lower.includes('lifetime')) {
    const totalData = await prisma.invoice.aggregate({
      where: { userId, isCancelled: false },
      _sum: { totalAmount: true, totalTax: true },
      _count: true,
    });

    result.answer = `Lifetime: ${totalData._count} invoice(s), ₹${Number(totalData._sum.totalAmount || 0).toLocaleString('en-IN')} revenue, ₹${Number(totalData._sum.totalTax || 0).toLocaleString('en-IN')} tax`;
    result.data = { count: totalData._count, revenue: Number(totalData._sum.totalAmount || 0) };
    return result;
  }

  // "expenses" / "spending"
  if (lower.includes('expense') || lower.includes('spend') || lower.includes('kharcha')) {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const expenseData = await prisma.expense.aggregate({
      where: { userId, date: { gte: thisMonth } },
      _sum: { amount: true },
      _count: true,
    });

    const totalExpense = await prisma.expense.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    result.answer = `This month expenses: ₹${Number(expenseData._sum.amount || 0).toLocaleString('en-IN')} (${expenseData._count} entries)\nAll time expenses: ₹${Number(totalExpense._sum.amount || 0).toLocaleString('en-IN')}`;
    result.data = { thisMonth: Number(expenseData._sum.amount || 0), total: Number(totalExpense._sum.amount || 0) };
    return result;
  }

  // "profit" / "loss" / "net"
  if (lower.includes('profit') || lower.includes('loss') || lower.includes('net')) {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [revenue, expenses] = await Promise.all([
      prisma.invoice.aggregate({
        where: { userId, invoiceDate: { gte: thisMonth }, isCancelled: false, paymentStatus: 'PAID' },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: thisMonth } },
        _sum: { amount: true },
      }),
    ]);

    const rev = Number(revenue._sum.totalAmount || 0);
    const exp = Number(expenses._sum.amount || 0);
    const profit = rev - exp;

    result.answer = `This month:\nRevenue: ₹${rev.toLocaleString('en-IN')}\nExpenses: ₹${exp.toLocaleString('en-IN')}\nNet: ₹${profit.toLocaleString('en-IN')} ${profit >= 0 ? '(Profit)' : '(Loss)'}`;
    result.data = { revenue: rev, expenses: exp, profit };
    return result;
  }

  // Default response
  result.answer = 'I can help with:\n\n• "Unpaid invoices" — pending payments\n• "Today\'s sales" — daily summary\n• "Top selling products" — best sellers\n• "Top customers" — best buyers\n• "This month" — monthly stats\n• "Sales comparison" — month vs month\n• "Expenses" — expense summary\n• "Profit" — net profit\n\nTry asking any of these!';
  return result;
}

// ============================================================
// 7. PAYMENT REMINDER GENERATOR
// ============================================================
function generatePaymentReminder(invoice, user) {
  const customerName = invoice.customerName || invoice.customer?.name || 'Customer';
  const amount = Number(invoice.totalAmount).toLocaleString('en-IN');
  const invoiceNumber = invoice.invoiceNumber;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '';

  const daysSinceDue = invoice.dueDate
    ? Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const greetings = [
    `Dear ${customerName},`,
    `Hi ${customerName},`,
    `${customerName} ji,`,
  ];

  const bodies = [
    `This is a friendly reminder that your invoice ${invoiceNumber} of ₹${amount} is pending.`,
    `Your invoice ${invoiceNumber} for ₹${amount} is awaiting payment.`,
    `Kindly note that invoice ${invoiceNumber} amounting to ₹${amount} is due.`,
  ];

  if (daysSinceDue > 0) {
    bodies.push(`Your invoice ${invoiceNumber} of ₹${amount} is overdue by ${daysSinceDue} day(s).`);
  }

  const closings = [
    `Please make the payment at your earliest convenience.`,
    `We would appreciate timely payment.`,
    `Looking forward to your payment.`,
    `Please pay at your earliest.`,
  ];

  const upiNote = user?.upiId ? `\n\nUPI: ${user.upiId}` : '';

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  return `${greeting}\n\n${body}\n${closing}\n\nThank you!\n${user?.businessName || user?.name || ''}${upiNote}`;
}

// ============================================================
// 8. AUTO CLASSIFY FROM PRODUCT NAME (for new products)
// ============================================================
function classifyProduct(productName) {
  const hsn = lookupHSN(productName);
  return {
    hsnCode: hsn.hsn,
    gstRate: hsn.gst,
    category: hsn.category,
    unit: hsn.unit || 'NOS',
  };
}

// ============================================================
// 9. EXPENSE CATEGORIZATION (existing, enhanced)
// ============================================================
const EXPENSE_CATEGORIES = {
  'rent': 'Rent', 'kiraya': 'Rent',
  'electricity': 'Utilities', 'bijli': 'Utilities', 'power': 'Utilities', 'bill': 'Utilities',
  'water': 'Utilities', 'paani': 'Utilities',
  'internet': 'Utilities', 'wifi': 'Utilities', 'broadband': 'Utilities',
  'phone': 'Utilities', 'mobile recharge': 'Utilities', 'recharge': 'Utilities',
  'office supplies': 'Office', 'stationery': 'Office', 'pen': 'Office', 'paper': 'Office',
  'printer': 'Office', 'cartridge': 'Office', 'toner': 'Office',
  'travel': 'Travel', 'uber': 'Travel', 'ola': 'Travel', 'taxi': 'Travel',
  'auto': 'Travel', 'metro': 'Travel', 'bus': 'Travel', 'train': 'Travel', 'flight': 'Travel',
  'petrol': 'Travel', 'diesel': 'Travel', 'fuel': 'Travel', 'parking': 'Travel', 'toll': 'Travel',
  'food': 'Food', 'lunch': 'Food', 'dinner': 'Food', 'breakfast': 'Food',
  'tea': 'Food', 'coffee': 'Food', 'snack': 'Food', 'meal': 'Food', 'zomato': 'Food', 'swiggy': 'Food',
  'marketing': 'Marketing', 'ads': 'Marketing', 'advertisement': 'Marketing',
  'google ads': 'Marketing', 'facebook ads': 'Marketing', 'instagram': 'Marketing',
  'salary': 'Salary', 'wages': 'Salary', 'staff': 'Salary', 'employee': 'Salary',
  'internet': 'Digital', 'software': 'Digital', 'subscription': 'Digital', 'saas': 'Digital',
  'hosting': 'Digital', 'domain': 'Digital', 'cloud': 'Digital',
  'phone repair': 'Maintenance', 'maintenance': 'Maintenance', 'repair': 'Maintenance',
  'insurance': 'Insurance', 'premium': 'Insurance',
  'tax': 'Tax', 'gst': 'Tax', 'income tax': 'Tax',
  'legal': 'Legal', 'lawyer': 'Legal', 'ca': 'Legal', 'chartered accountant': 'Legal',
  'postage': 'Shipping', 'courier': 'Shipping', 'delivery': 'Shipping', 'shipping': 'Shipping',
  'bank': 'Banking', 'interest': 'Banking', 'charges': 'Banking', 'commission': 'Banking',
};

function categorizeExpense(description) {
  const lower = description.toLowerCase();
  for (const [keyword, category] of Object.entries(EXPENSE_CATEGORIES)) {
    if (lower.includes(keyword)) return category;
  }
  return 'Other';
}

function suggestCategories(description) {
  const lower = description.toLowerCase();
  const matches = [];
  for (const [keyword, category] of Object.entries(EXPENSE_CATEGORIES)) {
    if (lower.includes(keyword) || category.toLowerCase().includes(lower)) {
      if (!matches.includes(category)) matches.push(category);
    }
  }
  return matches.length > 0 ? matches : ['Other'];
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  parseInvoiceCommand,
  parseWhatsAppMessage,
  parseOCRText,
  lookupHSN,
  suggestProducts,
  queryBusinessData,
  generatePaymentReminder,
  classifyProduct,
  categorizeExpense,
  suggestCategories,
  HSN_DATABASE,
  SUGGESTION_TEMPLATES,
};
