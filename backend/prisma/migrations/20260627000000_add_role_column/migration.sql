-- CreateEnum (skip if already exists)
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ACCOUNTANT', 'VIEWER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable (skip columns if already exist)
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'OWNER';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "upiId" TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
