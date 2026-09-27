ALTER TABLE "notification_settings"
  ADD COLUMN "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "msg91_auth_key_encrypted" TEXT,
  ADD COLUMN "whatsapp_integrated_number" TEXT,
  ADD COLUMN "whatsapp_template_name" TEXT NOT NULL DEFAULT 'jerzyfy_receipt',
  ADD COLUMN "whatsapp_template_namespace" TEXT,
  ADD COLUMN "whatsapp_template_language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "whatsapp_public_base_url" TEXT,
  ADD COLUMN "whatsapp_send_pos_receipt" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "whatsapp_send_order_receipt" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "WhatsappMessageKind" AS ENUM ('SALE_RECEIPT', 'ORDER_RECEIPT');
CREATE TYPE "WhatsappMessageStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "whatsapp_messages" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "kind" "WhatsappMessageKind" NOT NULL,
  "reference_id" TEXT NOT NULL,
  "phone" TEXT,
  "status" "WhatsappMessageStatus" NOT NULL,
  "provider_ref" TEXT,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_messages_tenant_id_kind_reference_id_key"
  ON "whatsapp_messages"("tenant_id", "kind", "reference_id");
CREATE INDEX "whatsapp_messages_tenant_id_created_at_idx" ON "whatsapp_messages"("tenant_id", "created_at");

ALTER TABLE "whatsapp_messages"
  ADD CONSTRAINT "whatsapp_messages_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
