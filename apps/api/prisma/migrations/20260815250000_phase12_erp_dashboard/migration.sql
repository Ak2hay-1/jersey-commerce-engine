-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "voided_at" TIMESTAMP(3),
ADD COLUMN "voided_by" TEXT,
ADD COLUMN "void_reason" TEXT;

-- CreateIndex
CREATE INDEX "expenses_tenant_id_status_idx" ON "expenses"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
