// GST Calculation Engine for Indian GST
// Supports CGST+SGST (intra-state) and IGST (inter-state)

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
  'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
];

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

const HSN_SAC_CODES = {
  // Common HSN codes for Indian businesses
  '998314': { desc: 'Consulting / IT Services', rate: 18 },
  '998313': { desc: 'Other IT Services', rate: 18 },
  '998312': { desc: 'Web Design / Development', rate: 18 },
  '998311': { desc: 'Management Consulting', rate: 18 },
  '998611': { desc: 'Printing Services', rate: 18 },
  '9954': { desc: 'Construction Services', rate: 18 },
  '9964': { desc: 'Transport Services', rate: 5 },
  '9965': { desc: 'Goods Transport Agency', rate: 5 },
  '9961': { desc: 'Financial Services', rate: 18 },
  '9971': { desc: 'Real Estate Services', rate: 18 },
  '9982': { desc: 'Legal Services', rate: 18 },
  '9991': { desc: 'Government Services', rate: 0 },
  '9992': { desc: 'Sponsored / Education Services', rate: 0 },
};

function isSameState(state1, state2) {
  if (!state1 || !state2) return false;
  return state1.toLowerCase().trim() === state2.toLowerCase().trim();
}

function calculateGST({ amount, gstRate, supplierState, customerState, reverseCharge = false }) {
  if (reverseCharge) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      totalAmount: amount,
      isInterState: false,
      isReverseCharge: true,
    };
  }

  const taxAmount = (amount * gstRate) / 100;
  const interState = !isSameState(supplierState, customerState);

  if (interState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
      totalTax: taxAmount,
      totalAmount: amount + taxAmount,
      isInterState: true,
      isReverseCharge: false,
    };
  }

  const halfTax = taxAmount / 2;
  return {
    cgst: halfTax,
    sgst: halfTax,
    igst: 0,
    totalTax: taxAmount,
    totalAmount: amount + taxAmount,
    isInterState: false,
    isReverseCharge: false,
  };
}

function calculateInvoiceTotals({ items, supplierState, customerState, discount = 0, reverseCharge = false }) {
  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;

  const calculatedItems = items.map((item) => {
    const lineAmount = item.quantity * item.unitPrice;
    const lineDiscount = lineAmount * (item.discount || 0) / 100;
    const taxableAmount = lineAmount - lineDiscount;

    const tax = calculateGST({
      amount: taxableAmount,
      gstRate: item.gstRate,
      supplierState,
      customerState,
      reverseCharge,
    });

    subtotal += taxableAmount;
    totalCgst += tax.cgst;
    totalSgst += tax.sgst;
    totalIgst += tax.igst;

    return {
      ...item,
      taxableAmount,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
      totalAmount: taxableAmount + tax.totalTax,
    };
  });

  const totalTax = totalCgst + totalSgst + totalIgst + totalCess;
  const totalAmount = subtotal - discount + totalTax;

  return {
    items: calculatedItems,
    subtotal: round(subtotal),
    discountAmount: round(discount),
    cgst: round(totalCgst),
    sgst: round(totalSgst),
    igst: round(totalIgst),
    cess: round(totalCess),
    totalTax: round(totalTax),
    totalAmount: round(totalAmount),
    isInterState: !isSameState(supplierState, customerState),
  };
}

function round(amount) {
  return Math.round(amount * 100) / 100;
}

function formatCurrency(amount) {
  const num = Number(amount);
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function validateGSTIN(gstin) {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin);
}

function extractStateFromGSTIN(gstin) {
  if (!gstin || gstin.length < 2) return null;
  const stateCode = gstin.substring(0, 2);
  const stateMap = {
    '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
    '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli',
    '27': 'Maharashtra', '28': 'Andhra Pradesh (old)',
    '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
    '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands', '36': 'Telangana',
    '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory',
  };
  return stateMap[stateCode] || null;
}

module.exports = {
  INDIAN_STATES,
  GST_RATES,
  HSN_SAC_CODES,
  isSameState,
  calculateGST,
  calculateInvoiceTotals,
  formatCurrency,
  validateGSTIN,
  extractStateFromGSTIN,
};
