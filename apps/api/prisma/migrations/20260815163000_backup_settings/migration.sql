-- CreateEnum
CREATE TYPE "BackupIntervalUnit" AS ENUM ('HOURS', 'DAYS', 'WEEKS', 'MONTHS');

-- CreateEnum
CREATE TYPE "BackupRunTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "BackupRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "backup_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "destination_path" TEXT NOT NULL DEFAULT '',
    "schedule_time" TEXT NOT NULL DEFAULT '02:00',
    "interval_value" INTEGER NOT NULL DEFAULT 1,
    "interval_unit" "BackupIntervalUnit" NOT NULL DEFAULT 'DAYS',
    "retain_copies" INTEGER NOT NULL DEFAULT 14,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "settings_id" TEXT NOT NULL,
    "trigger" "BackupRunTrigger" NOT NULL,
    "status" "BackupRunStatus" NOT NULL,
    "file_name" TEXT,
    "file_path" TEXT,
    "file_size_bytes" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backup_settings_tenant_id_key" ON "backup_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "backup_settings_enabled_next_run_at_idx" ON "backup_settings"("enabled", "next_run_at");

-- CreateIndex
CREATE INDEX "backup_runs_tenant_id_created_at_idx" ON "backup_runs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "backup_runs_tenant_id_status_idx" ON "backup_runs"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "backup_settings" ADD CONSTRAINT "backup_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "backup_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
