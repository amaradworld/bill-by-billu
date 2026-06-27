-- Create PaymentRequest table for manual UPI payment verification
CREATE TABLE IF NOT EXISTS "PaymentRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "utrNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentRequest_userId_idx" ON "PaymentRequest"("userId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_status_idx" ON "PaymentRequest"("status");

ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
