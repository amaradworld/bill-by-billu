-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "ewayBillNumber" TEXT,
ADD COLUMN "ewayBillDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "ewayBillConfig" TEXT;
