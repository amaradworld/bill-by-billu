const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, generateEWayBill, updateVehicle, getEWayBill, STATE_CODES } = require('../services/ewaybill');
const { authenticate: authMiddleware } = require('../middlewares/auth');

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Save E-Way Bill credentials
router.post('/config', async (req, res) => {
  try {
    const { gstin, username, password, apiUrl, clientId, clientSecret } = req.body;
    if (!gstin || !username || !password) {
      return res.status(400).json({ error: 'GSTIN, username, and password are required' });
    }
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        ewayBillConfig: JSON.stringify({ gstin, username, password, apiUrl: apiUrl || 'production', clientId: clientId || '', clientSecret: clientSecret || '' }),
      },
    });
    res.json({ success: true, message: 'E-Way Bill credentials saved' });
  } catch (error) {
    console.error('Save EWB config error:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
});

// Get E-Way Bill config (masked)
router.get('/config', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { ewayBillConfig: true } });
    if (!user?.ewayBillConfig) {
      return res.json({ configured: false });
    }
    const config = JSON.parse(user.ewayBillConfig);
    res.json({
      configured: true,
      gstin: config.gstin,
      username: config.username,
      apiUrl: config.apiUrl,
      clientId: config.clientId ? '****' : '',
      clientSecret: config.clientSecret ? '****' : '',
    });
  } catch (error) {
    console.error('Get EWB config error:', error);
    res.status(500).json({ error: 'Failed to get credentials' });
  }
});

// Test E-Way Bill connection
router.post('/test', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { ewayBillConfig: true } });
    if (!user?.ewayBillConfig) {
      return res.status(400).json({ error: 'E-Way Bill credentials not configured' });
    }
    const config = JSON.parse(user.ewayBillConfig);
    const result = await authenticate(config);
    res.json({ success: true, message: 'Connection successful', expiry: result.expiry });
  } catch (error) {
    console.error('Test EWB connection error:', error);
    res.status(400).json({ error: error.message || 'Connection failed' });
  }
});

// Generate E-Way Bill for an invoice
router.post('/generate/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { vehicleNumber, transporterId, transportMode, distance } = req.body;

    if (!vehicleNumber) {
      return res.status(400).json({ error: 'Vehicle number is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { ewayBillConfig: true, businessName: true, name: true, gstNumber: true, address: true, city: true, state: true, pincode: true },
    });

    if (!user?.ewayBillConfig) {
      return res.status(400).json({ error: 'E-Way Bill credentials not configured. Go to Settings to set up.' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: req.userId },
      include: { items: true, customer: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.ewayBillNumber) {
      return res.status(400).json({ error: `E-Way Bill already generated: ${invoice.ewayBillNumber}` });
    }

    const config = JSON.parse(user.ewayBillConfig);

    const vehicleDetails = {
      vehicleNumber,
      transporterId: transporterId || '',
      transportMode: transportMode || 'Road',
      distance: distance || 0,
    };

    const result = await generateEWayBill({
      config,
      invoice,
      user,
      customer: invoice.customer,
      items: invoice.items,
      vehicleDetails,
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ewayBillNumber: result.ewayBillNumber,
        ewayBillDate: new Date(result.ewayBillDate),
      },
    });

    res.json({
      success: true,
      ewayBillNumber: result.ewayBillNumber,
      ewayBillDate: result.ewayBillDate,
      validUpto: result.validUpto,
    });
  } catch (error) {
    console.error('Generate EWB error:', error);
    res.status(400).json({ error: error.message || 'Failed to generate E-Way Bill' });
  }
});

// Get E-Way Bill details
router.get('/details/:ewayBillNumber', async (req, res) => {
  try {
    const { ewayBillNumber } = req.params;
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { ewayBillConfig: true } });
    if (!user?.ewayBillConfig) {
      return res.status(400).json({ error: 'E-Way Bill credentials not configured' });
    }
    const config = JSON.parse(user.ewayBillConfig);
    const result = await getEWayBill(config, ewayBillNumber);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get EWB error:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch E-Way Bill' });
  }
});

// Update vehicle details for existing E-Way Bill
router.put('/update-vehicle/:ewayBillNumber', async (req, res) => {
  try {
    const { ewayBillNumber } = req.params;
    const { vehicleNumber, fromPlace, fromState, transporterId, transportMode, transportDocNo, transportDocDate } = req.body;

    if (!vehicleNumber) {
      return res.status(400).json({ error: 'Vehicle number is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { ewayBillConfig: true } });
    if (!user?.ewayBillConfig) {
      return res.status(400).json({ error: 'E-Way Bill credentials not configured' });
    }

    const config = JSON.parse(user.ewayBillConfig);
    const result = await updateVehicle({
      config,
      ewayBillNumber,
      vehicleDetails: { vehicleNumber, fromPlace, fromState, transporterId, transportMode, transportDocNo, transportDocDate },
    });

    res.json(result);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(400).json({ error: error.message || 'Failed to update vehicle' });
  }
});

// Get state codes reference
router.get('/state-codes', (req, res) => {
  res.json(STATE_CODES);
});

module.exports = router;
