-- AlterTable
ALTER TABLE "User" ADD COLUMN "invoiceTemplate" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE "User" ADD COLUMN "bankName" TEXT;
ALTER TABLE "User" ADD COLUMN "bankAccount" TEXT;
ALTER TABLE "User" ADD COLUMN "bankIfsc" TEXT;
ALTER TABLE "User" ADD COLUMN "bankBranch" TEXT;
