import { gzipSync } from 'node:zlib';
import type { PrismaService } from '../prisma/prisma.service';

const BACKUP_FORMAT = 'jersey-commerce-backup';
const BACKUP_VERSION = 1;

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
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const [
    users,
    roles,
    userRoles,
    rolePermissions,
    categories,
    products,
    productVariants,
    productImages,
    inventories,
    inventoryMovements,
    customers,
    suppliers,
    purchases,
    purchaseItems,
    supplierPayments,
    sales,
    saleItems,
    orders,
    orderItems,
    orderShippingAddresses,
    carts,
    cartItems,
    payments,
    expenseCategories,
    expenses,
    websiteSettings,
    auditLogs,
  ] = await prisma.$transaction([
    prisma.user.findMany({ where: { tenantId } }),
    prisma.role.findMany({ where: { tenantId } }),
    prisma.userRole.findMany({ where: { tenantId } }),
    prisma.rolePermission.findMany({ where: { tenantId } }),
    prisma.category.findMany({ where: { tenantId } }),
    prisma.product.findMany({ where: { tenantId } }),
    prisma.productVariant.findMany({ where: { tenantId } }),
    prisma.productImage.findMany({ where: { tenantId } }),
    prisma.inventory.findMany({ where: { tenantId } }),
    prisma.inventoryMovement.findMany({ where: { tenantId } }),
    prisma.customer.findMany({ where: { tenantId } }),
    prisma.supplier.findMany({ where: { tenantId } }),
    prisma.purchase.findMany({ where: { tenantId } }),
    prisma.purchaseItem.findMany({ where: { tenantId } }),
    prisma.supplierPayment.findMany({ where: { tenantId } }),
    prisma.sale.findMany({ where: { tenantId } }),
    prisma.saleItem.findMany({ where: { tenantId } }),
    prisma.order.findMany({ where: { tenantId } }),
    prisma.orderItem.findMany({ where: { tenantId } }),
    prisma.orderShippingAddress.findMany({ where: { tenantId } }),
    prisma.cart.findMany({ where: { tenantId } }),
    prisma.cartItem.findMany({ where: { tenantId } }),
    prisma.payment.findMany({ where: { tenantId } }),
    prisma.expenseCategory.findMany({ where: { tenantId } }),
    prisma.expense.findMany({ where: { tenantId } }),
    prisma.websiteSettings.findMany({ where: { tenantId } }),
    prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5000 }),
  ]);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    generatedAt: new Date().toISOString(),
    tenant,
    data: {
      users,
      roles,
      userRoles,
      rolePermissions,
      categories,
      products,
      productVariants,
      productImages,
      inventories,
      inventoryMovements,
      customers,
      suppliers,
      purchases,
      purchaseItems,
      supplierPayments,
      sales,
      saleItems,
      orders,
      orderItems,
      orderShippingAddresses,
      carts,
      cartItems,
      payments,
      expenseCategories,
      expenses,
      websiteSettings,
      auditLogs,
    },
  };
}

export function compressBackupPayload(payload: unknown): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(payload, jsonReplacer), 'utf8'));
}

export function backupFileName(slug: string, at: Date): string {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'tenant';
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  return `jersey-${safeSlug}-${stamp}.json.gz`;
}
