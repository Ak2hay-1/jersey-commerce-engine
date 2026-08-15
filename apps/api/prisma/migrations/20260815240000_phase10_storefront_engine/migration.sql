-- Phase 10 storefront: tenant host mapping, customer passwords, website theme tokens.

CREATE TYPE "TenantHostKind" AS ENUM ('DOMAIN', 'SUBDOMAIN');

ALTER TABLE "tenants"
  ADD COLUMN "accent_color" TEXT;

ALTER TABLE "customers"
  ADD COLUMN "password_hash" TEXT;

ALTER TABLE "website_settings"
  ADD COLUMN "accent_color" TEXT,
  ADD COLUMN "background_color" TEXT,
  ADD COLUMN "foreground_color" TEXT,
  ADD COLUMN "heading_font" TEXT,
  ADD COLUMN "body_font" TEXT;

CREATE TABLE "tenant_hosts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "kind" "TenantHostKind" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_hosts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_hosts_host_key" ON "tenant_hosts"("host");
CREATE INDEX "tenant_hosts_tenant_id_idx" ON "tenant_hosts"("tenant_id");

ALTER TABLE "tenant_hosts"
  ADD CONSTRAINT "tenant_hosts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
