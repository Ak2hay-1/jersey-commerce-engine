-- Product sell channel (storefront vs POS-only) + multi-warehouse shipping origins.

CREATE TYPE "ProductSalesChannel" AS ENUM ('ONLINE_AND_POS', 'POS_ONLY');

CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "delhivery_pickup_location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "warehouses_tenant_id_idx" ON "warehouses"("tenant_id");
CREATE INDEX "warehouses_tenant_id_is_active_idx" ON "warehouses"("tenant_id", "is_active");

ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products" ADD COLUMN "sales_channel" "ProductSalesChannel" NOT NULL DEFAULT 'ONLINE_AND_POS';
ALTER TABLE "products" ADD COLUMN "warehouse_id" TEXT;

CREATE INDEX "products_tenant_id_sales_channel_idx" ON "products"("tenant_id", "sales_channel");
CREATE INDEX "products_tenant_id_warehouse_id_idx" ON "products"("tenant_id", "warehouse_id");

ALTER TABLE "products" ADD CONSTRAINT "products_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed up to one warehouse per tenant from existing ShippingSettings warehouse fields.
INSERT INTO "warehouses" (
  "id", "tenant_id", "name", "phone", "address", "city", "state", "postal_code", "country",
  "delhivery_pickup_location", "is_active", "sort_order", "created_at", "updated_at"
)
SELECT
  ('wh_' || md5(ss.tenant_id)),
  ss.tenant_id,
  COALESCE(NULLIF(TRIM(ss.warehouse_name), ''), 'Main warehouse'),
  ss.warehouse_phone,
  ss.warehouse_address,
  ss.warehouse_city,
  ss.warehouse_state,
  ss.warehouse_postal_code,
  COALESCE(ss.warehouse_country, 'IN'),
  ss.pickup_location,
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "shipping_settings" ss
WHERE ss.warehouse_name IS NOT NULL
   OR ss.warehouse_address IS NOT NULL
   OR ss.pickup_location IS NOT NULL;

-- Shipments: allow multiple per order + optional warehouse.
ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_order_id_key";
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "warehouse_id" TEXT;

CREATE INDEX IF NOT EXISTS "shipments_tenant_id_order_id_idx" ON "shipments"("tenant_id", "order_id");
CREATE INDEX IF NOT EXISTS "shipments_warehouse_id_idx" ON "shipments"("warehouse_id");

ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_warehouse_id_fkey";
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
