-- AlterEnum
ALTER TYPE "SupplierStatus" ADD VALUE 'BLOCKED';

-- CreateEnum
CREATE TYPE "SupplierPaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER');

-- AlterTable tenants: purchasing policies (defaults deny over-receive, overpay, and catalog cost overwrite)
ALTER TABLE "tenants"
  ADD COLUMN "allow_purchase_over_receive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allow_supplier_overpay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "update_variant_cost_on_receive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable suppliers
ALTER TABLE "suppliers"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "postal_code" TEXT;

CREATE INDEX "suppliers_tenant_id_name_idx" ON "suppliers"("tenant_id", "name");

-- AlterTable purchases
ALTER TABLE "purchases"
  ADD COLUMN "expected_delivery_date" TIMESTAMP(3),
  ADD COLUMN "created_by" TEXT,
  ADD COLUMN "ordered_at" TIMESTAMP(3),
  ADD COLUMN "received_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_by" TEXT,
  ADD COLUMN "cancel_reason" TEXT;

CREATE INDEX "purchases_tenant_id_created_at_idx" ON "purchases"("tenant_id", "created_at");

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable purchase_items
ALTER TABLE "purchase_items" RENAME COLUMN "quantity" TO "ordered_quantity";
ALTER TABLE "purchase_items"
  ADD COLUMN "received_quantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discount" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "purchase_items_purchase_id_product_variant_id_key" ON "purchase_items"("purchase_id", "product_variant_id");

-- AlterTable supplier_payments
ALTER TABLE "supplier_payments" ADD COLUMN "created_by" TEXT;
ALTER TABLE "supplier_payments"
  ALTER COLUMN "method" TYPE "SupplierPaymentMethod"
  USING (
    CASE
      WHEN "method"::text = 'ONLINE' THEN 'OTHER'
      ELSE "method"::text
    END
  )::"SupplierPaymentMethod";

CREATE INDEX "supplier_payments_tenant_id_created_at_idx" ON "supplier_payments"("tenant_id", "created_at");

ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable purchase_receipts
CREATE TABLE "purchase_receipts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_receipt_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "purchase_item_id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_receipts_tenant_id_idx" ON "purchase_receipts"("tenant_id");
CREATE INDEX "purchase_receipts_tenant_id_purchase_id_idx" ON "purchase_receipts"("tenant_id", "purchase_id");
CREATE INDEX "purchase_receipts_tenant_id_supplier_id_idx" ON "purchase_receipts"("tenant_id", "supplier_id");
CREATE INDEX "purchase_receipts_tenant_id_created_at_idx" ON "purchase_receipts"("tenant_id", "created_at");

CREATE INDEX "purchase_receipt_items_tenant_id_idx" ON "purchase_receipt_items"("tenant_id");
CREATE INDEX "purchase_receipt_items_receipt_id_idx" ON "purchase_receipt_items"("receipt_id");
CREATE INDEX "purchase_receipt_items_purchase_item_id_idx" ON "purchase_receipt_items"("purchase_item_id");
CREATE INDEX "purchase_receipt_items_product_variant_id_idx" ON "purchase_receipt_items"("product_variant_id");

ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
