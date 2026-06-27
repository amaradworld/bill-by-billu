-- Add qrUrl column for static Paytm QR code image
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "qrUrl" TEXT;
