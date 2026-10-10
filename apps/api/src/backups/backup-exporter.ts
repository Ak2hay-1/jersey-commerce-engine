import { gzipSync } from 'node:zlib';
import type { PrismaService } from '../prisma/prisma.service';
import { ENCRYPTED_BACKUP_EXTENSION } from './backup-crypto';

const BACKUP_FORMAT = 'jersey-commerce-backup';
const BACKUP_VERSION = 2;

/**
 * Every shop-owned table, in foreign-key-safe insert order for a restore.
 * Short-lived security rows (refresh/password-reset tokens, checkout idempotency keys) are deliberately excluded.
 */
export const BACKUP_TABLES = [
  ['users', 'user'],
  ['roles', 'role'],
  ['userRoles', 'userRole'],
  ['rolePermissions', 'rolePermission'],
  ['tenantHosts', 'tenantHost'],
  ['authSettings', 'authSettings'],
  ['paymentSettings', 'paymentSettings'],
  ['notificationSettings', 'notificationSettings'],
  ['shippingSettings', 'shippingSettings'],
  ['websiteSettings', 'websiteSettings'],
  ['backupSettings', 'backupSettings'],
  ['warehouses', 'warehouse'],
  ['categories', 'category'],
  ['products', 'product'],
  ['productVariants', 'productVariant'],
  ['productImages', 'productImage'],
  ['inventories', 'inventory'],
  ['inventoryMovements', 'inventoryMovement'],
  ['customers', 'customer'],
  ['customerIdentities', 'customerIdentity'],
  ['tags', 'tag'],
  ['customerTags', 'customerTag'],
  ['customerNotes', 'customerNote'],
  ['customerPreferences', 'customerPreference'],
  ['suppliers', 'supplier'],
  ['purchases', 'purchase'],
  ['purchaseItems', 'purchaseItem'],
  ['purchaseReceipts', 'purchaseReceipt'],
  ['purchaseReceiptItems', 'purchaseReceiptItem'],
  ['supplierPayments', 'supplierPayment'],
  ['documentSequences', 'documentSequence'],
  ['promoCodes', 'promoCode'],
  ['posSessions', 'posSession'],
  ['posCarts', 'posCart'],
  ['posCartItems', 'posCartItem'],
  ['sales', 'sale'],
  ['saleItems', 'saleItem'],
  ['carts', 'cart'],
  ['cartItems', 'cartItem'],
  ['orders', 'order'],
  ['orderItems', 'orderItem'],
  ['orderShippingAddresses', 'orderShippingAddress'],
  ['shipments', 'shipment'],
  ['payments', 'payment'],
  ['refunds', 'refund'],
  ['refundItems', 'refundItem'],
  ['refundPayments', 'refundPayment'],
  ['expenseCategories', 'expenseCategory'],
  ['expenses', 'expense'],
  ['customizationOptions', 'customizationOption'],
  ['customOrders', 'customOrder'],
  ['customOrderItems', 'customOrderItem'],
  ['customOrderCustomizations', 'customOrderCustomization'],
  ['customOrderQuotes', 'customOrderQuote'],
  ['customOrderFiles', 'customOrderFile'],
  ['customOrderDesigns', 'customOrderDesign'],
  ['customOrderDesignApprovals', 'customOrderDesignApproval'],
  ['customOrderNotes', 'customOrderNote'],
  ['customOrderTimelineEvents', 'customOrderTimelineEvent'],
  ['customOrderProductionEvents', 'customOrderProductionEvent'],
  ['customOrderCommunicationEvents', 'customOrderCommunicationEvent'],
  ['whatsappMessages', 'whatsappMessage'],
  ['backupRuns', 'backupRun'],
] as const;

const AUDIT_LOG_LIMIT = 20_000;

type FindManyDelegate = { findMany: (args: object) => Promise<unknown[]> };

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === 'object' && 'toFixed' in value && typeof value.toFixed === 'function') {
    return String(value);
  }
  return value;
}

export async function buildTenantBackupPayload(prisma: PrismaService, tenantId: string) {
  const client = prisma as unknown as Record<string, FindManyDelegate>;
  // One repeatable-read snapshot so rows across tables are mutually consistent.
  const results = await prisma.$transaction(
    async (tx) => {
      const db = tx as unknown as Record<string, FindManyDelegate>;
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      const data: Record<string, unknown[]> = {};
      for (const [key, delegate] of BACKUP_TABLES) {
        const model = db[delegate] ?? client[delegate];
        if (!model) {
          throw new Error(`Backup table ${delegate} is missing from the Prisma client.`);
        }
        data[key] = await model.findMany({ where: { tenantId } });
      }
      data.auditLogs = await tx.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: AUDIT_LOG_LIMIT,
      });
      return { tenant, data };
    },
    { isolationLevel: 'RepeatableRead', timeout: 120_000, maxWait: 10_000 },
  );

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    generatedAt: new Date().toISOString(),
    tables: [...BACKUP_TABLES.map(([key]) => key), 'auditLogs'],
    tenant: results.tenant,
    data: results.data,
  };
}

export function compressBackupPayload(payload: unknown): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(payload, jsonReplacer), 'utf8'));
}

export function backupFileName(slug: string, at: Date, encrypted = false): string {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'tenant';
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  return `jersey-${safeSlug}-${stamp}${encrypted ? ENCRYPTED_BACKUP_EXTENSION : '.json.gz'}`;
}
