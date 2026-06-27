-- AlterTable: Add missing inventory columns to Product (schema drift fix)
ALTER TABLE "Product" ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "reorderLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "costPrice" DECIMAL(12,2);
