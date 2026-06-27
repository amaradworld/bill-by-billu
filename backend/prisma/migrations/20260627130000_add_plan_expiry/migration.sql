-- AlterTable: Add plan expiry for subscription tracking
ALTER TABLE "User" ADD COLUMN "planExpiry" TIMESTAMP(3);
