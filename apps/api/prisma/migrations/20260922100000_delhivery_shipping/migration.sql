-- AlterEnum
ALTER TYPE "ShippingCalculationMode" ADD VALUE 'DELHIVERY';

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'COD';

-- CreateEnum
CREATE TYPE "ShipmentProvider" AS ENUM ('DELHIVERY');

-- CreateEnum
CREATE TYPE "DelhiveryEnvironment" AS ENUM ('STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "DelhiveryServiceMode" AS ENUM ('EXPRESS', 'SURFACE');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "access_token_hash" TEXT;

-- CreateIndex
CREATE INDEX "orders_tenant_id_access_token_hash_idx" ON "orders"("tenant_id", "access_token_hash");

-- CreateTable
CREATE TABLE "shipping_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "delhivery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delhivery_api_token_encrypted" TEXT,
    "delhivery_environment" "DelhiveryEnvironment" NOT NULL DEFAULT 'STAGING',
    "delhivery_service_mode" "DelhiveryServiceMode" NOT NULL DEFAULT 'SURFACE',
    "cod_enabled" BOOLEAN NOT NULL DEFAULT false,
    "default_package_weight_kg" DECIMAL(10,3) NOT NULL DEFAULT 0.5,
    "warehouse_name" TEXT,
    "warehouse_phone" TEXT,
    "warehouse_address" TEXT,
    "warehouse_city" TEXT,
    "warehouse_state" TEXT,
    "warehouse_postal_code" TEXT,
    "warehouse_country" TEXT NOT NULL DEFAULT 'IN',
    "pickup_location" TEXT,
    "webhook_secret_encrypted" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" "ShipmentProvider" NOT NULL DEFAULT 'DELHIVERY',
    "waybill" TEXT,
    "tracking_url" TEXT,
    "label_url" TEXT,
    "package_weight_kg" DECIMAL(10,3),
    "carrier_shipping_amount" DECIMAL(14,2),
    "cod_amount" DECIMAL(14,2),
    "provider_status" TEXT,
    "provider_ref" TEXT,
    "last_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_settings_tenant_id_key" ON "shipping_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_tenant_id_idx" ON "shipments"("tenant_id");

-- CreateIndex
CREATE INDEX "shipments_tenant_id_waybill_idx" ON "shipments"("tenant_id", "waybill");

-- AddForeignKey
ALTER TABLE "shipping_settings" ADD CONSTRAINT "shipping_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
