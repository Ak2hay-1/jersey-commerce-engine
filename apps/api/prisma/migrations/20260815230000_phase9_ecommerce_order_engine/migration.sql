-- Phase 9 ecommerce order engine: carts, checkout, shipping snapshots, payment/fulfillment state.

CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED');
CREATE TYPE "FulfillmentMethod" AS ENUM ('DELIVERY', 'STORE_PICKUP');
CREATE TYPE "ShippingCalculationMode" AS ENUM ('FREE', 'FIXED');
CREATE TYPE "OrderInventoryState" AS ENUM ('NONE', 'RESERVED', 'RELEASED', 'CONSUMED');

ALTER TABLE "tenants"
  ADD COLUMN "shipping_calculation_mode" "ShippingCalculationMode" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "shipping_fixed_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "free_shipping_min_subtotal" DECIMAL(14, 2);

CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "customer_id" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "converted_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carts_public_id_key" ON "carts"("public_id");
CREATE UNIQUE INDEX "carts_token_hash_key" ON "carts"("token_hash");
CREATE UNIQUE INDEX "carts_converted_order_id_key" ON "carts"("converted_order_id");
CREATE INDEX "carts_tenant_id_idx" ON "carts"("tenant_id");
CREATE INDEX "carts_tenant_id_status_idx" ON "carts"("tenant_id", "status");
CREATE INDEX "carts_tenant_id_customer_id_idx" ON "carts"("tenant_id", "customer_id");
CREATE INDEX "carts_tenant_id_expires_at_idx" ON "carts"("tenant_id", "expires_at");

CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14, 2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cart_items_public_id_key" ON "cart_items"("public_id");
CREATE UNIQUE INDEX "cart_items_cart_id_product_variant_id_key" ON "cart_items"("cart_id", "product_variant_id");
CREATE INDEX "cart_items_tenant_id_idx" ON "cart_items"("tenant_id");
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");
CREATE INDEX "cart_items_product_variant_id_idx" ON "cart_items"("product_variant_id");

ALTER TABLE "orders"
  ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "fulfillment_method" "FulfillmentMethod" NOT NULL DEFAULT 'DELIVERY',
  ADD COLUMN "inventory_state" "OrderInventoryState" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "discount_type" "DiscountType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "discount_value" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "shipping_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "currency" VARCHAR(3),
  ADD COLUMN "cancel_reason" TEXT,
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_by" TEXT,
  ADD COLUMN "confirmed_at" TIMESTAMP(3),
  ADD COLUMN "shipped_at" TIMESTAMP(3),
  ADD COLUMN "completed_at" TIMESTAMP(3),
  ADD COLUMN "sale_id" TEXT;

UPDATE "orders" AS o
SET "currency" = COALESCE(t."currency", 'INR')
FROM "tenants" AS t
WHERE t."id" = o."tenant_id" AND o."currency" IS NULL;

ALTER TABLE "orders"
  ALTER COLUMN "currency" SET NOT NULL;

CREATE UNIQUE INDEX "orders_sale_id_key" ON "orders"("sale_id");
CREATE INDEX "orders_tenant_id_payment_status_idx" ON "orders"("tenant_id", "payment_status");
CREATE INDEX "orders_tenant_id_total_idx" ON "orders"("tenant_id", "total");

ALTER TABLE "order_items"
  ADD COLUMN "product_name_snapshot" TEXT,
  ADD COLUMN "sku_snapshot" TEXT,
  ADD COLUMN "size_snapshot" TEXT,
  ADD COLUMN "color_snapshot" TEXT,
  ADD COLUMN "variant_snapshot" JSONB,
  ADD COLUMN "discount_type" "DiscountType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "discount_value" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "tax" DECIMAL(14, 2) NOT NULL DEFAULT 0;

UPDATE "order_items" AS oi
SET
  "product_name_snapshot" = COALESCE(p."name", 'Product'),
  "sku_snapshot" = COALESCE(pv."sku", oi."id"),
  "size_snapshot" = pv."size",
  "color_snapshot" = pv."color"
FROM "product_variants" AS pv
JOIN "products" AS p ON p."id" = pv."product_id"
WHERE pv."id" = oi."product_variant_id";

UPDATE "order_items"
SET "product_name_snapshot" = 'Product', "sku_snapshot" = "id"
WHERE "product_name_snapshot" IS NULL OR "sku_snapshot" IS NULL;

ALTER TABLE "order_items"
  ALTER COLUMN "product_name_snapshot" SET NOT NULL,
  ALTER COLUMN "sku_snapshot" SET NOT NULL;

CREATE INDEX "order_items_sku_snapshot_idx" ON "order_items"("sku_snapshot");

CREATE TABLE "order_shipping_addresses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',

    CONSTRAINT "order_shipping_addresses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_shipping_addresses_order_id_key" ON "order_shipping_addresses"("order_id");
CREATE INDEX "order_shipping_addresses_tenant_id_idx" ON "order_shipping_addresses"("tenant_id");

CREATE TABLE "checkout_idempotency" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "request_fingerprint" TEXT NOT NULL,
    "cart_id" TEXT,
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_idempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checkout_idempotency_tenant_id_key_hash_key" ON "checkout_idempotency"("tenant_id", "key_hash");
CREATE INDEX "checkout_idempotency_tenant_id_idx" ON "checkout_idempotency"("tenant_id");
CREATE INDEX "checkout_idempotency_order_id_idx" ON "checkout_idempotency"("order_id");

ALTER TABLE "carts"
  ADD CONSTRAINT "carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "carts_converted_order_id_fkey" FOREIGN KEY ("converted_order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "cart_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "orders_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_shipping_addresses"
  ADD CONSTRAINT "order_shipping_addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "order_shipping_addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checkout_idempotency"
  ADD CONSTRAINT "checkout_idempotency_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "checkout_idempotency_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "checkout_idempotency_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "document_sequences" ("id", "tenant_id", "document_type", "prefix", "next_number", "pad_length", "created_at", "updated_at")
SELECT concat('ordseq_', t."id"), t."id", 'ORDER', 'ORD', 1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "document_sequences" ds
  WHERE ds."tenant_id" = t."id" AND ds."document_type" = 'ORDER'
);
