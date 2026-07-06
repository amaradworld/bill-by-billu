const crypto = require('crypto');
const logger = require('../logger');

const EWB_API_URLS = {
  production: 'https://apis.ewaybillgst.gov.in/ewaybillapi/v1.03',
  sandbox: 'https://ewb1api.gstsandbox.nic.in/ewaybillapi/v1.03',
};

const STATE_CODES = {
  'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
  'Chhattisgarh': '22', 'Goa': '30', 'Gujarat': '24', 'Haryana': '06',
  'Himachal Pradesh': '02', 'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32',
  'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17',
  'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Punjab': '03',
  'Rajasthan': '08', 'Sikkim': '11', 'Tamil Nadu': '33', 'Telangana': '36',
  'Tripura': '16', 'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19',
  'Delhi': '07', 'Jammu and Kashmir': '01', 'Ladakh': '38', 'Chandigarh': '04',
  'Puducherry': '34', 'Andaman and Nicobar Islands': '35',
  'Dadra and Nagar Haveli and Daman and Diu': '26', 'Lakshadweep': '31',
};

const TRANSPORT_MODES = { ROAD: '1', RAIL: '2', AIR: '3', SHIP: '4' };

function getStateCode(stateName) {
  if (!stateName) return '07';
  return STATE_CODES[stateName] || '07';
}

function encryptPayload(data, sek) {
  const jsonStr = JSON.stringify(data);
  const base64 = Buffer.from(jsonStr).toString('base64');
  const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(sek, 'utf8'), null);
  let encrypted = cipher.update(base64, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function decryptPayload(encryptedBase64, sek) {
  const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(sek, 'utf8'), null);
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(Buffer.from(decrypted, 'base64').toString('utf8'));
}

async function authenticate(config) {
  const { gstin, username, password, apiUrl } = config;
  const url = apiUrl || EWB_API_URLS.production;

  const authData = {
    action: 'ACCESSTOKEN',
    username,
    password,
    gstin,
  };

  const res = await fetch(`${url}/Auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authData),
  });

  const data = await res.json();
  if (data.status !== 1) {
    throw new Error(data.error || data.message || 'E-Way Bill authentication failed');
  }

  return {
    authToken: data.authToken,
    sek: data.sek,
    expiry: data.expiry,
  };
}

async function generateEWayBill({ config, invoice, user, customer, items, vehicleDetails }) {
  const { authToken, sek } = await authenticate(config);
  const url = config.apiUrl || EWB_API_URLS.production;

  const supplyType = invoice.reverseCharge ? 'R' : 'O';
  const docType = 'INV';

  const itemDetails = items.map(item => ({
    itemNo: items.indexOf(item) + 1,
    productName: item.name || 'Goods',
    hsnCode: item.hsnCode || '9999',
    quantity: item.quantity || 1,
    qnty: item.unit || 'NOS',
    taxableAmount: Number(item.taxableAmount || item.unitPrice * item.quantity),
    cgstRate: Number(item.gstRate || 0) / 2,
    cgstAmount: Number(item.cgst || 0),
    sgstRate: Number(item.gstRate || 0) / 2,
    sgstAmount: Number(item.sgst || 0),
    igstRate: Number(item.gstRate || 0),
    igstAmount: Number(item.igst || 0),
    cessRate: 0,
    cessAmount: 0,
  }));

  const totalTaxable = itemDetails.reduce((sum, i) => sum + i.taxableAmount, 0);
  const totalCgst = itemDetails.reduce((sum, i) => sum + i.cgstAmount, 0);
  const totalSgst = itemDetails.reduce((sum, i) => sum + i.sgstAmount, 0);
  const totalIgst = itemDetails.reduce((sum, i) => sum + i.igstAmount, 0);

  const genEwbReq = {
    supplyType,
    subSupplyType: '0',
    docType,
    docNo: invoice.invoiceNumber,
    docDate: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    fromGstin: user.gstNumber,
    fromTrdName: user.businessName || user.name,
    fromAddr1: user.address || '',
    fromAddr2: '',
    fromPlace: user.city || '',
    fromStateCode: parseInt(getStateCode(user.state)),
    fromPincode: parseInt(user.pincode || '110001'),
    actfromStateCode: parseInt(getStateCode(user.state)),
    toGstin: customer.gstNumber || 'URP',
    toTrdName: customer.name || 'Walk-in Customer',
    toAddr1: customer.address || '',
    toAddr2: '',
    toPlace: '',
    toStateCode: parseInt(getStateCode(customer.state)),
    toPincode: parseInt(customer.pincode || '110001'),
    acttoStateCode: parseInt(getStateCode(customer.state)),
    totalValue: totalTaxable,
    cgstValue: totalCgst,
    sgstValue: totalSgst,
    igstValue: totalIgst,
    cessValue: 0,
    totalInvValue: Number(invoice.totalAmount),
    transportMode: vehicleDetails.transportMode || 'Road',
    transportDocNo: '',
    transportDocDate: '',
    transportDistance: vehicleDetails.distance || 0,
    vehNo: vehicleDetails.vehicleNumber || '',
    vehicleType: 'R',
    items: itemDetails,
    itemNosList: itemDetails.map(i => i.itemNo).join(','),
    mainHsnCode: itemDetails[0]?.hsnCode || '9999',
    othordNo: invoice.invoiceNumber,
    ENTRYBY: 'T',
    entryDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  };

  if (vehicleDetails.transporterId) {
    genEwbReq.transId = vehicleDetails.transporterId;
  }

  const encrypted = encryptPayload(genEwbReq, sek);
  const payload = {
    action: 'GENEWAYBILL',
    ek: encrypted,
  };

  const res = await fetch(`${url}/ewayapi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client-id': config.clientId || '',
      'client-secret': config.clientSecret || '',
      'gstin': config.gstin,
      'authtoken': authToken,
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.json();
  if (raw.status !== 1) {
    throw new Error(raw.error || raw.message || 'E-Way Bill generation failed');
  }

  const result = decryptPayload(raw.ek, sek);
  return {
    ewayBillNumber: result.ewayBillNo,
    ewayBillDate: result.ewayBillDate,
    validUpto: result.validUpto,
    generateStatus: result.genStatus,
  };
}

async function updateVehicle({ config, ewayBillNumber, vehicleDetails }) {
  const { authToken, sek } = await authenticate(config);
  const url = config.apiUrl || EWB_API_URLS.production;

  const updateReq = {
    ewayBillNo: parseInt(ewayBillNumber),
    vehicleNo: vehicleDetails.vehicleNumber,
    fromPlace: vehicleDetails.fromPlace || '',
    fromState: parseInt(getStateCode(vehicleDetails.fromState)),
    reasonCode: '1',
    reasonRem: 'Vehicle changed',
    transportMode: vehicleDetails.transportMode || 'Road',
    transportDocNo: vehicleDetails.transportDocNo || '',
    transportDocDate: vehicleDetails.transportDocDate || '',
  };

  if (vehicleDetails.transporterId) {
    updateReq.transId = vehicleDetails.transporterId;
  }

  const encrypted = encryptPayload(updateReq, sek);
  const payload = {
    action: 'VEHEWB',
    ek: encrypted,
  };

  const res = await fetch(`${url}/ewayapi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client-id': config.clientId || '',
      'client-secret': config.clientSecret || '',
      'gstin': config.gstin,
      'authtoken': authToken,
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.json();
  if (raw.status !== 1) {
    throw new Error(raw.error || raw.message || 'Vehicle update failed');
  }

  return { success: true, message: 'Vehicle details updated successfully' };
}

async function getEWayBill(config, ewayBillNumber) {
  const { authToken, sek } = await authenticate(config);
  const url = config.apiUrl || EWB_API_URLS.production;

  const res = await fetch(`${url}/ewayapi/GetEwayBill?ewbNo=${ewayBillNumber}`, {
    headers: {
      'client-id': config.clientId || '',
      'client-secret': config.clientSecret || '',
      'gstin': config.gstin,
      'authtoken': authToken,
    },
  });

  const raw = await res.json();
  if (raw.status !== 1) {
    throw new Error(raw.error || raw.message || 'Failed to fetch E-Way Bill');
  }

  return decryptPayload(raw.ek, sek);
}

module.exports = {
  authenticate,
  generateEWayBill,
  updateVehicle,
  getEWayBill,
  STATE_CODES,
  TRANSPORT_MODES,
  EWB_API_URLS,
};
