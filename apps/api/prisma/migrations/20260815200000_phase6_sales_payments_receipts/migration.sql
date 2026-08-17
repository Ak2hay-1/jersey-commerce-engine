-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RestockDisposition" AS ENUM ('RESTOCK', 'DAMAGE', 'NONE');

-- AlterTable tenants tax defaults (not a legal GST profile)
ALTER TABLE "tenants"
  ADD COLUMN "default_tax_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_inclusive_pricing" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable product_variants
ALTER TABLE "product_variants"
  ADD COLUMN "tax_rate" DECIMAL(7, 4),
  ADD COLUMN "tax_inclusive" BOOLEAN;

-- AlterTable sales
ALTER TABLE "sales"
  ADD COLUMN "discount_type" "DiscountType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "discount_value" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "receipt_payload" JSONB,
  ADD COLUMN "receipt_issued_at" TIMESTAMP(3);

CREATE INDEX "sales_tenant_id_total_idx" ON "sales"("tenant_id", "total");

-- AlterTable sale_items snapshots
ALTER TABLE "sale_items"
  ADD COLUMN "product_name" TEXT,
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "size" TEXT,
  ADD COLUMN "color" TEXT,
  ADD COLUMN "discount_type" "DiscountType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "discount_value" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "tax" DECIMAL(14, 2) NOT NULL DEFAULT 0;

UPDATE "sale_items" AS si
SET
  "product_name" = COALESCE(p."name", 'Product'),
  "sku" = COALESCE(pv."sku", si."id"),
  "size" = pv."size",
  "color" = pv."color"
FROM "product_variants" AS pv
JOIN "products" AS p ON p."id" = pv."product_id"
WHERE pv."id" = si."product_variant_id";

UPDATE "sale_items"
SET "product_name" = 'Product', "sku" = "id"
WHERE "product_name" IS NULL OR "sku" IS NULL;

ALTER TABLE "sale_items"
  ALTER COLUMN "product_name" SET NOT NULL,
  ALTER COLUMN "sku" SET NOT NULL;

CREATE INDEX "sale_items_sku_idx" ON "sale_items"("sku");

-- AlterTable payments
ALTER TABLE "payments"
  ADD COLUMN "pos_session_id" TEXT,
  ADD COLUMN "created_by" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "payments_tenant_id_created_at_idx" ON "payments"("tenant_id", "created_at");
CREATE INDEX "payments_tenant_id_created_by_idx" ON "payments"("tenant_id", "created_by");
CREATE INDEX "payments_pos_session_id_idx" ON "payments"("pos_session_id");

CREATE UNIQUE INDEX "payments_tenant_method_reference_unique"
  ON "payments" ("tenant_id", "method", lower("reference"))
  WHERE "reference" IS NOT NULL AND btrim("reference") <> '' AND "status" NOT IN ('FAILED', 'CANCELLED');

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_pos_session_id_fkey" FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable refunds
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "amount" DECIMAL(14, 2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'COMPLETED',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "refunds_tenant_id_idx" ON "refunds"("tenant_id");
CREATE INDEX "refunds_tenant_id_sale_id_idx" ON "refunds"("tenant_id", "sale_id");
CREATE INDEX "refunds_tenant_id_created_at_idx" ON "refunds"("tenant_id", "created_at");
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");
CREATE INDEX "refunds_created_by_idx" ON "refunds"("created_by");

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable refund_items
CREATE TABLE "refund_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refund_id" TEXT NOT NULL,
    "sale_item_id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "quantity" INT NOT NULL,
    "amount" DECIMAL(14, 2) NOT NULL,
    "restock" "RestockDisposition" NOT NULL DEFAULT 'RESTOCK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "refund_items_tenant_id_idx" ON "refund_items"("tenant_id");
CREATE INDEX "refund_items_refund_id_idx" ON "refund_items"("refund_id");
CREATE INDEX "refund_items_sale_item_id_idx" ON "refund_items"("sale_item_id");
CREATE INDEX "refund_items_product_variant_id_idx" ON "refund_items"("product_variant_id");

ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable refund_payments
CREATE TABLE "refund_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refund_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "amount" DECIMAL(14, 2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "provider" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "refund_payments_tenant_id_idx" ON "refund_payments"("tenant_id");
CREATE INDEX "refund_payments_refund_id_idx" ON "refund_payments"("refund_id");
CREATE INDEX "refund_payments_payment_id_idx" ON "refund_payments"("payment_id");

ALTER TABLE "refund_payments" ADD CONSTRAINT "refund_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_payments" ADD CONSTRAINT "refund_payments_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_payments" ADD CONSTRAINT "refund_payments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
