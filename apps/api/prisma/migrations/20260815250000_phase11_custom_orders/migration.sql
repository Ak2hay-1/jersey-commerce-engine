-- Phase 11 custom/team/bulk jersey order engine.

ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

CREATE TYPE "CustomOrderType" AS ENUM ('CUSTOM_JERSEY', 'TEAM_ORDER', 'CORPORATE_ORDER', 'COLLEGE_ORDER', 'TOURNAMENT_ORDER', 'BULK_ORDER');
CREATE TYPE "CustomOrderStatus" AS ENUM ('INQUIRY', 'QUOTATION', 'QUOTE_SENT', 'CUSTOMER_APPROVAL', 'DEPOSIT_PENDING', 'CONFIRMED', 'DESIGN_PENDING', 'DESIGN_APPROVAL', 'PRODUCTION', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CustomOrderItemMode" AS ENUM ('PLAYER_LIST', 'SIZE_QUANTITY');
CREATE TYPE "CustomizationPricingType" AS ENUM ('FIXED', 'PER_ITEM', 'PERCENTAGE');
CREATE TYPE "CustomizationOptionStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CustomOrderFileKind" AS ENUM ('REFERENCE', 'DESIGN');
CREATE TYPE "DesignApprovalDecision" AS ENUM ('APPROVE', 'REQUEST_CHANGES');
CREATE TYPE "DesignApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED');
CREATE TYPE "QuoteAcceptanceState" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'SUPERSEDED', 'CANCELLED');
CREATE TYPE "CustomOrderPaymentState" AS ENUM ('UNPAID', 'DEPOSIT_RECEIVED', 'PARTIALLY_PAID', 'PAID');
CREATE TYPE "CustomOrderProductionStatus" AS ENUM ('DESIGN_PENDING', 'DESIGN_APPROVAL', 'MATERIAL_PENDING', 'PRODUCTION', 'QUALITY_CHECK', 'READY');
CREATE TYPE "CustomOrderCommunicationType" AS ENUM ('QUOTE_CREATED', 'QUOTE_SENT', 'DESIGN_READY', 'DESIGN_APPROVAL_REQUIRED', 'ORDER_CONFIRMED', 'PRODUCTION_STARTED', 'READY_FOR_PICKUP', 'ORDER_COMPLETED');
CREATE TYPE "CustomOrderCommunicationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "customization_options" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricing_type" "CustomizationPricingType" NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "status" "CustomizationOptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customization_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "CustomOrderStatus" NOT NULL DEFAULT 'INQUIRY',
    "type" "CustomOrderType" NOT NULL DEFAULT 'CUSTOM_JERSEY',
    "ordering_mode" "CustomOrderItemMode",
    "payment_status" "CustomOrderPaymentState" NOT NULL DEFAULT 'UNPAID',
    "production_status" "CustomOrderProductionStatus",
    "inventory_state" "OrderInventoryState" NOT NULL DEFAULT 'NONE',
    "description" TEXT,
    "team_name" TEXT,
    "preferred_jersey_type" TEXT,
    "preferred_colours" TEXT,
    "customization_requirements" TEXT,
    "estimated_quantity" INTEGER NOT NULL DEFAULT 0,
    "requested_delivery_date" TIMESTAMP(3),
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shipping_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deposit_required" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deposit_paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance_due" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancel_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "created_by" TEXT,
    "accepted_quote_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "product_variant_id" TEXT,
    "line_type" "CustomOrderItemMode" NOT NULL,
    "player_name" TEXT,
    "jersey_number" TEXT,
    "size" TEXT,
    "colour" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "customization_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_customizations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "customization_option_id" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "pricing_type_snapshot" "CustomizationPricingType" NOT NULL,
    "price_snapshot" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_customizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_quotes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "quote_number" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "customization_charges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shipping_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "deposit_required" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estimated_completion_date" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "acceptance_state" "QuoteAcceptanceState" NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMP(3),
    "accepted_by_customer_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_files" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "kind" "CustomOrderFileKind" NOT NULL,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_designs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "notes" TEXT,
    "approval_status" "DesignApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_designs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_design_approvals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "decision" "DesignApprovalDecision" NOT NULL,
    "comment" TEXT,
    "decided_by_user_id" TEXT,
    "decided_by_customer_id" TEXT,
    "is_customer_decision" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_design_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_timeline_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_production_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "status" "CustomOrderProductionStatus" NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_production_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custom_order_communication_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "type" "CustomOrderCommunicationType" NOT NULL,
    "status" "CustomOrderCommunicationStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_order_communication_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payments" ADD COLUMN "custom_order_id" TEXT;

CREATE UNIQUE INDEX "custom_orders_public_id_key" ON "custom_orders"("public_id");
CREATE UNIQUE INDEX "custom_orders_accepted_quote_id_key" ON "custom_orders"("accepted_quote_id");
CREATE UNIQUE INDEX "custom_orders_tenant_id_order_number_key" ON "custom_orders"("tenant_id", "order_number");
CREATE INDEX "custom_orders_tenant_id_idx" ON "custom_orders"("tenant_id");
CREATE INDEX "custom_orders_tenant_id_status_idx" ON "custom_orders"("tenant_id", "status");
CREATE INDEX "custom_orders_tenant_id_type_idx" ON "custom_orders"("tenant_id", "type");
CREATE INDEX "custom_orders_tenant_id_customer_id_idx" ON "custom_orders"("tenant_id", "customer_id");
CREATE INDEX "custom_orders_tenant_id_created_at_idx" ON "custom_orders"("tenant_id", "created_at");
CREATE INDEX "custom_orders_tenant_id_payment_status_idx" ON "custom_orders"("tenant_id", "payment_status");
CREATE INDEX "custom_orders_order_number_idx" ON "custom_orders"("order_number");

CREATE INDEX "customization_options_tenant_id_idx" ON "customization_options"("tenant_id");
CREATE INDEX "customization_options_tenant_id_status_idx" ON "customization_options"("tenant_id", "status");

CREATE INDEX "custom_order_items_tenant_id_idx" ON "custom_order_items"("tenant_id");
CREATE INDEX "custom_order_items_custom_order_id_idx" ON "custom_order_items"("custom_order_id");
CREATE INDEX "custom_order_items_product_variant_id_idx" ON "custom_order_items"("product_variant_id");

CREATE UNIQUE INDEX "custom_order_customizations_custom_order_id_customization_option_id_key" ON "custom_order_customizations"("custom_order_id", "customization_option_id");
CREATE INDEX "custom_order_customizations_tenant_id_idx" ON "custom_order_customizations"("tenant_id");
CREATE INDEX "custom_order_customizations_customization_option_id_idx" ON "custom_order_customizations"("customization_option_id");

CREATE UNIQUE INDEX "custom_order_quotes_custom_order_id_version_key" ON "custom_order_quotes"("custom_order_id", "version");
CREATE UNIQUE INDEX "custom_order_quotes_tenant_id_quote_number_version_key" ON "custom_order_quotes"("tenant_id", "quote_number", "version");
CREATE INDEX "custom_order_quotes_tenant_id_idx" ON "custom_order_quotes"("tenant_id");
CREATE INDEX "custom_order_quotes_tenant_id_quote_number_idx" ON "custom_order_quotes"("tenant_id", "quote_number");
CREATE INDEX "custom_order_quotes_custom_order_id_is_current_idx" ON "custom_order_quotes"("custom_order_id", "is_current");

CREATE INDEX "custom_order_files_tenant_id_idx" ON "custom_order_files"("tenant_id");
CREATE INDEX "custom_order_files_custom_order_id_idx" ON "custom_order_files"("custom_order_id");

CREATE UNIQUE INDEX "custom_order_designs_custom_order_id_version_key" ON "custom_order_designs"("custom_order_id", "version");
CREATE INDEX "custom_order_designs_tenant_id_idx" ON "custom_order_designs"("tenant_id");
CREATE INDEX "custom_order_designs_file_id_idx" ON "custom_order_designs"("file_id");

CREATE INDEX "custom_order_design_approvals_tenant_id_idx" ON "custom_order_design_approvals"("tenant_id");
CREATE INDEX "custom_order_design_approvals_custom_order_id_idx" ON "custom_order_design_approvals"("custom_order_id");
CREATE INDEX "custom_order_design_approvals_design_id_idx" ON "custom_order_design_approvals"("design_id");

CREATE INDEX "custom_order_notes_tenant_id_idx" ON "custom_order_notes"("tenant_id");
CREATE INDEX "custom_order_notes_tenant_id_custom_order_id_created_at_idx" ON "custom_order_notes"("tenant_id", "custom_order_id", "created_at");

CREATE INDEX "custom_order_timeline_events_tenant_id_idx" ON "custom_order_timeline_events"("tenant_id");
CREATE INDEX "custom_order_timeline_events_tenant_id_custom_order_id_created_at_idx" ON "custom_order_timeline_events"("tenant_id", "custom_order_id", "created_at");

CREATE INDEX "custom_order_production_events_tenant_id_idx" ON "custom_order_production_events"("tenant_id");
CREATE INDEX "custom_order_production_events_tenant_id_custom_order_id_created_at_idx" ON "custom_order_production_events"("tenant_id", "custom_order_id", "created_at");

CREATE INDEX "custom_order_communication_events_tenant_id_idx" ON "custom_order_communication_events"("tenant_id");
CREATE INDEX "custom_order_communication_events_tenant_id_custom_order_id_created_at_idx" ON "custom_order_communication_events"("tenant_id", "custom_order_id", "created_at");
CREATE INDEX "custom_order_communication_events_tenant_id_type_status_idx" ON "custom_order_communication_events"("tenant_id", "type", "status");

CREATE INDEX "payments_custom_order_id_idx" ON "payments"("custom_order_id");

ALTER TABLE "customization_options" ADD CONSTRAINT "customization_options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_items" ADD CONSTRAINT "custom_order_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_items" ADD CONSTRAINT "custom_order_items_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_items" ADD CONSTRAINT "custom_order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_customizations" ADD CONSTRAINT "custom_order_customizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_customizations" ADD CONSTRAINT "custom_order_customizations_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_order_customizations" ADD CONSTRAINT "custom_order_customizations_customization_option_id_fkey" FOREIGN KEY ("customization_option_id") REFERENCES "customization_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_quotes" ADD CONSTRAINT "custom_order_quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_quotes" ADD CONSTRAINT "custom_order_quotes_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_quotes" ADD CONSTRAINT "custom_order_quotes_accepted_by_customer_id_fkey" FOREIGN KEY ("accepted_by_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_quotes" ADD CONSTRAINT "custom_order_quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_accepted_quote_id_fkey" FOREIGN KEY ("accepted_quote_id") REFERENCES "custom_order_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_files" ADD CONSTRAINT "custom_order_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_files" ADD CONSTRAINT "custom_order_files_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_files" ADD CONSTRAINT "custom_order_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_designs" ADD CONSTRAINT "custom_order_designs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_designs" ADD CONSTRAINT "custom_order_designs_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_designs" ADD CONSTRAINT "custom_order_designs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "custom_order_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_designs" ADD CONSTRAINT "custom_order_designs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_design_approvals" ADD CONSTRAINT "custom_order_design_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_design_approvals" ADD CONSTRAINT "custom_order_design_approvals_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_design_approvals" ADD CONSTRAINT "custom_order_design_approvals_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "custom_order_designs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_design_approvals" ADD CONSTRAINT "custom_order_design_approvals_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_design_approvals" ADD CONSTRAINT "custom_order_design_approvals_decided_by_customer_id_fkey" FOREIGN KEY ("decided_by_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_notes" ADD CONSTRAINT "custom_order_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_notes" ADD CONSTRAINT "custom_order_notes_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_notes" ADD CONSTRAINT "custom_order_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_timeline_events" ADD CONSTRAINT "custom_order_timeline_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_timeline_events" ADD CONSTRAINT "custom_order_timeline_events_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_timeline_events" ADD CONSTRAINT "custom_order_timeline_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_production_events" ADD CONSTRAINT "custom_order_production_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_production_events" ADD CONSTRAINT "custom_order_production_events_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_production_events" ADD CONSTRAINT "custom_order_production_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_order_communication_events" ADD CONSTRAINT "custom_order_communication_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_order_communication_events" ADD CONSTRAINT "custom_order_communication_events_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
