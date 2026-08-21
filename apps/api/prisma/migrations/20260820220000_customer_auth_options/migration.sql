-- CreateEnum
CREATE TYPE "EmailOtpProvider" AS ENUM ('CONSOLE', 'RESEND', 'SMTP');

-- CreateEnum
CREATE TYPE "SmsOtpProvider" AS ENUM ('CONSOLE', 'MSG91', 'TWILIO');

-- CreateEnum
CREATE TYPE "CustomerIdentityProvider" AS ENUM ('GOOGLE');

-- CreateTable
CREATE TABLE "auth_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "password_login_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_otp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sms_otp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "google_sign_in_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_provider" "EmailOtpProvider" NOT NULL DEFAULT 'CONSOLE',
    "email_from_address" TEXT,
    "email_from_name" TEXT,
    "resend_api_key_encrypted" TEXT,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_user" TEXT,
    "smtp_password_encrypted" TEXT,
    "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
    "sms_provider" "SmsOtpProvider" NOT NULL DEFAULT 'CONSOLE',
    "sms_api_key_encrypted" TEXT,
    "sms_sender_id" TEXT,
    "twilio_account_sid" TEXT,
    "twilio_auth_token_encrypted" TEXT,
    "sms_from_number" TEXT,
    "google_client_id" TEXT,
    "google_client_secret_encrypted" TEXT,
    "otp_ttl_seconds" INTEGER NOT NULL DEFAULT 300,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_identities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" "CustomerIdentityProvider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_settings_tenant_id_key" ON "auth_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_identities_tenant_id_customer_id_idx" ON "customer_identities"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_tenant_id_provider_provider_subject_key" ON "customer_identities"("tenant_id", "provider", "provider_subject");

-- AddForeignKey
ALTER TABLE "auth_settings" ADD CONSTRAINT "auth_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
