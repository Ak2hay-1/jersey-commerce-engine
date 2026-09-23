-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "telegram_enabled" BOOLEAN NOT NULL DEFAULT false,
    "telegram_bot_token_encrypted" TEXT,
    "telegram_chat_id" TEXT,
    "notify_order_created" BOOLEAN NOT NULL DEFAULT true,
    "notify_custom_order_created" BOOLEAN NOT NULL DEFAULT true,
    "notify_payment_confirmed" BOOLEAN NOT NULL DEFAULT true,
    "notify_order_status_changed" BOOLEAN NOT NULL DEFAULT true,
    "notify_pos_sale" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_tenant_id_key" ON "notification_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
