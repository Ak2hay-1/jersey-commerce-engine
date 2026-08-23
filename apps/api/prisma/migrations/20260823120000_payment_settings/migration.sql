-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "razorpay_enabled" BOOLEAN NOT NULL DEFAULT false,
    "razorpay_key_id" TEXT,
    "razorpay_key_secret_encrypted" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_settings_tenant_id_key" ON "payment_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
