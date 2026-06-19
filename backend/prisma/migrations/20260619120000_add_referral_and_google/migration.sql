-- AlterTable
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT,
ADD COLUMN "referredBy" TEXT,
ADD COLUMN "referralCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_referralCode_idx" ON "User"("referralCode");
