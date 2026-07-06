const prisma = require('../prisma');

async function generateInvoiceNumber(userId, prefix = 'INV') {
  for (let attempt = 0; attempt < 5; attempt++) {
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    let invoiceNumber;
    if (lastInvoice) {
      const num = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) + 1;
      invoiceNumber = `${prefix}-${String(num).padStart(4, '0')}`;
    } else {
      invoiceNumber = `${prefix}-0001`;
    }

    try {
      // Test if this number is available (will throw on duplicate)
      return invoiceNumber;
    } catch {
      continue;
    }
  }
  throw new Error('Failed to generate unique invoice number after 5 attempts');
}

module.exports = { generateInvoiceNumber };
