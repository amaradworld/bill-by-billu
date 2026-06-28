-- AlterTable: Add trial end date for 28-day PRO trial
ALTER TABLE "User" ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- Set trialEndsAt for existing users (from their signup date + 28 days)
UPDATE "User" SET "trialEndsAt" = "createdAt" + INTERVAL '28 days' WHERE "trialEndsAt" IS NULL;
