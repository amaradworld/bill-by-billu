const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../prisma');
const { authenticate, JWT_SECRET } = require('../middlewares/auth');
const { validateGSTIN, extractStateFromGSTIN } = require('../services/gst');
const { encrypt, decrypt } = require('../services/crypto');
const logger = require('../logger');

const router = express.Router();
const googleClient = new OAuth2Client();

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(8),
  name: z.string().min(2),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  invoicePrefix: z.string().optional(),
  currency: z.string().optional(),
  whatsappNumber: z.string().optional(),
  razorpayKeyId: z.string().optional(),
  razorpayKeySecret: z.string().optional(),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    if (data.gstNumber && !validateGSTIN(data.gstNumber)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    let state = data.state;
    if (data.gstNumber && !state) {
      state = extractStateFromGSTIN(data.gstNumber);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    let referralCodeGen = generateReferralCode();
    while (await prisma.user.findUnique({ where: { referralCode: referralCodeGen } })) {
      referralCodeGen = generateReferralCode();
    }

    let referredById = null;
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: data.referralCode } });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone || null,
        passwordHash,
        name: data.name,
        businessName: data.businessName || null,
        gstNumber: data.gstNumber || null,
        panNumber: data.panNumber || null,
        address: data.address || null,
        city: data.city || null,
        state: state || null,
        pincode: data.pincode || null,
        invoicePrefix: data.invoicePrefix || 'INV',
        currency: data.currency || 'INR',
        whatsappNumber: data.whatsappNumber || null,
        referralCode: referralCodeGen,
        referredBy: referredById,
      },
      select: {
        id: true, email: true, phone: true, name: true,
        businessName: true, gstNumber: true, plan: true,
        invoicePrefix: true, currency: true, whatsappNumber: true,
        referralCode: true, createdAt: true,
      },
    });

    if (referredById) {
      await prisma.user.update({
        where: { id: referredById },
        data: { referralCount: { increment: 1 } },
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || '',
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }
    } else {
      let referralCodeGen = generateReferralCode();
      while (await prisma.user.findUnique({ where: { referralCode: referralCodeGen } })) {
        referralCodeGen = generateReferralCode();
      }

      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          googleId,
          passwordHash: await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 12),
          referralCode: referralCodeGen,
          logoUrl: picture || null,
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/referral/validate
router.post('/referral/validate', authenticate, async (req, res) => {
  try {
    const { referralCode } = req.body;
    if (!referralCode) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    const referrer = await prisma.user.findUnique({ where: { referralCode } });
    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    if (referrer.id === req.userId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    res.json({ valid: true, referrerName: referrer.name });
  } catch (err) {
    console.error('Referral validate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/referral/stats
router.get('/referral/stats', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { referralCode: true, referralCount: true },
    });

    res.json({
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralLink: `${process.env.FRONTEND_URL || 'https://bill-by-billu.vercel.app'}/register?ref=${user.referralCode}`,
    });
  } catch (err) {
    console.error('Referral stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, phone: true, name: true,
        businessName: true, gstNumber: true, panNumber: true,
        address: true, city: true, state: true, pincode: true,
        logoUrl: true, plan: true, invoicePrefix: true, currency: true, whatsappNumber: true,
        referralCode: true, referralCount: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const data = registerSchema.partial().parse(req.body);

    if (data.gstNumber && !validateGSTIN(data.gstNumber)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    // Encrypt Razorpay secret before saving
    if (data.razorpayKeySecret) {
      data.razorpayKeySecret = encrypt(data.razorpayKeySecret);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: {
        id: true, email: true, phone: true, name: true,
        businessName: true, gstNumber: true, panNumber: true,
        address: true, city: true, state: true, pincode: true,
        plan: true, invoicePrefix: true, currency: true, whatsappNumber: true,
        razorpayKeyId: true,
      },
    });
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Forgot Password ───

// In-memory reset tokens (in production, use Redis or DB)
const resetTokens = new Map();

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour

    resetTokens.set(user.id, { token, expires });

    // Try to send email via nodemailer if configured
    const resetUrl = `${process.env.FRONTEND_URL || 'https://billbybillu.vercel.app'}/reset-password?token=${token}&userId=${user.id}`;

    try {
      const nodemailer = require('nodemailer');
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'Reset Your Bill By Billu Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">Reset Your Password</h2>
              <p>Hi ${user.name},</p>
              <p>Click the button below to reset your password. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
              <p style="margin-top: 20px; color: #666; font-size: 12px;">If you didn't request this, ignore this email.</p>
            </div>
          `,
        });
        logger.info({ userId: user.id }, 'Password reset email sent');
      } else {
        logger.warn('SMTP not configured — password reset token generated but email not sent');
      }
    } catch (emailErr) {
      logger.error({ err: emailErr }, 'Failed to send reset email');
    }

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, userId, newPassword } = req.body;
    if (!token || !userId || !newPassword) {
      return res.status(400).json({ error: 'Token, userId, and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const stored = resetTokens.get(userId);
    if (!stored || stored.token !== token) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (Date.now() > stored.expires) {
      resetTokens.delete(userId);
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    resetTokens.delete(userId);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
