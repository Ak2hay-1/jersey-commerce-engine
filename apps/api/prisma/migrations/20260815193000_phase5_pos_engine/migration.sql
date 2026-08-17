-- AlterEnum
ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- CreateEnum
CREATE TYPE "PosSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PosCartStatus" AS ENUM ('ACTIVE', 'HELD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NONE', 'FIXED', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "pos_session_id" TEXT,
ADD COLUMN "pos_cart_id" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "cancelled_at" TIMESTAMP(3),
ADD COLUMN "cancelled_by" TEXT,
ADD COLUMN "cancel_reason" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "amount_received" DECIMAL(14,2),
ADD COLUMN "change_due" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opening_cash" DECIMAL(14,2) NOT NULL,
    "closing_cash" DECIMAL(14,2),
    "expected_cash" DECIMAL(14,2) NOT NULL,
    "cash_sales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cash_refunds" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "card_sales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "upi_sales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_sales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_carts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pos_session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "status" "PosCartStatus" NOT NULL DEFAULT 'ACTIVE',
    "discount_type" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discount_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "held_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_cart_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "quantity" INT NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "discount_type" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discount_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'INV',
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "pad_length" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_pos_cart_id_key" ON "sales"("pos_cart_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_pos_session_id_idx" ON "sales"("tenant_id", "pos_session_id");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_idx" ON "pos_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_user_id_status_idx" ON "pos_sessions"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_status_idx" ON "pos_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pos_sessions_tenant_id_opened_at_idx" ON "pos_sessions"("tenant_id", "opened_at");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sessions_one_open_per_user" ON "pos_sessions"("tenant_id", "user_id") WHERE "status" = 'OPEN';

-- CreateIndex
CREATE INDEX "pos_carts_tenant_id_idx" ON "pos_carts"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_carts_tenant_id_pos_session_id_status_idx" ON "pos_carts"("tenant_id", "pos_session_id", "status");

-- CreateIndex
CREATE INDEX "pos_carts_tenant_id_user_id_status_idx" ON "pos_carts"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_carts_one_active_per_session" ON "pos_carts"("pos_session_id") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "pos_cart_items_cart_id_product_variant_id_key" ON "pos_cart_items"("cart_id", "product_variant_id");

-- CreateIndex
CREATE INDEX "pos_cart_items_tenant_id_idx" ON "pos_cart_items"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_cart_items_cart_id_idx" ON "pos_cart_items"("cart_id");

-- CreateIndex
CREATE INDEX "pos_cart_items_product_variant_id_idx" ON "pos_cart_items"("product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_tenant_id_document_type_key" ON "document_sequences"("tenant_id", "document_type");

-- CreateIndex
CREATE INDEX "document_sequences_tenant_id_idx" ON "document_sequences"("tenant_id");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_pos_session_id_fkey" FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_pos_cart_id_fkey" FOREIGN KEY ("pos_cart_id") REFERENCES "pos_carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_carts" ADD CONSTRAINT "pos_carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_carts" ADD CONSTRAINT "pos_carts_pos_session_id_fkey" FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_carts" ADD CONSTRAINT "pos_carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_carts" ADD CONSTRAINT "pos_carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cart_items" ADD CONSTRAINT "pos_cart_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cart_items" ADD CONSTRAINT "pos_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "pos_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cart_items" ADD CONSTRAINT "pos_cart_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
