-- AlterEnum
ALTER TYPE "RoleCode" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "website_settings" ADD COLUMN "footer_config" JSONB;

-- AlterTable
ALTER TABLE "carts" ADD COLUMN "promo_code_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "promo_code_id" TEXT;

-- CreateEnum
CREATE TYPE "PromoCodeStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(14,2) NOT NULL,
    "min_subtotal" DECIMAL(14,2),
    "max_discount" DECIMAL(14,2),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "status" "PromoCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_tenant_id_code_key" ON "promo_codes"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "promo_codes_tenant_id_idx" ON "promo_codes"("tenant_id");

-- CreateIndex
CREATE INDEX "promo_codes_tenant_id_status_idx" ON "promo_codes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "promo_codes_created_by_idx" ON "promo_codes"("created_by");

-- CreateIndex
CREATE INDEX "carts_promo_code_id_idx" ON "carts"("promo_code_id");

-- CreateIndex
CREATE INDEX "orders_promo_code_id_idx" ON "orders"("promo_code_id");

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
