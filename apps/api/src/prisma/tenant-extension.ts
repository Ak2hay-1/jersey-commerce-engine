import { Prisma, PrismaClient } from './client';
import { getRequestContext } from '../common/context/request-context';

const TENANT_SCOPED_MODELS = new Set<string>([
  'User',
  'Role',
  'UserRole',
  'RolePermission',
  'Category',
  'Product',
  'ProductVariant',
  'ProductImage',
  'Inventory',
  'InventoryMovement',
  'Customer',
  'Tag',
  'CustomerTag',
  'CustomerNote',
  'CustomerPreference',
  'Supplier',
  'Purchase',
  'PurchaseItem',
  'PurchaseReceipt',
  'PurchaseReceiptItem',
  'SupplierPayment',
  'Sale',
  'SaleItem',
  'PosSession',
  'PosCart',
  'PosCartItem',
  'DocumentSequence',
  'Cart',
  'CartItem',
  'Order',
  'OrderItem',
  'OrderShippingAddress',
  'CheckoutIdempotency',
  'Payment',
  'Refund',
  'RefundItem',
  'RefundPayment',
  'ExpenseCategory',
  'Expense',
  'AuditLog',
  'CustomOrder',
  'CustomOrderItem',
  'CustomOrderQuote',
  'CustomOrderDesign',
  'CustomOrderDesignApproval',
  'CustomOrderFile',
  'CustomOrderNote',
  'CustomOrderTimelineEvent',
  'CustomOrderProductionEvent',
  'CustomOrderCommunicationEvent',
  'CustomOrderCustomization',
  'CustomizationOption',
  'WebsiteSettings',
  'BackupSettings',
  'BackupRun',
  'RefreshToken',
  'PasswordResetToken',
  'TenantHost',
]);

type QueryArgs = {
  where?: Record<string, unknown>;
  data?: unknown;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function stripTenantId(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => stripTenantId(item));
  }
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  const next = { ...(data as Record<string, unknown>) };
  delete next.tenantId;
  return next;
}

function applyTenantToArgs(operation: string, args: QueryArgs, tenantId: string): QueryArgs {
  const next: QueryArgs = { ...args };
  if (
    [
      'findMany',
      'findFirst',
      'findFirstOrThrow',
      'count',
      'aggregate',
      'groupBy',
      'updateMany',
      'deleteMany',
      'updateManyAndReturn',
    ].includes(operation)
  ) {
    next.where = { ...asRecord(next.where), tenantId };
  }
  if (operation === 'create') {
    next.data = { ...asRecord(next.data), tenantId };
  }
  if (operation === 'createMany' || operation === 'createManyAndReturn') {
    next.data = Array.isArray(next.data)
      ? next.data.map((item) => ({ ...asRecord(item), tenantId }))
      : { ...asRecord(next.data), tenantId };
  }
  if (operation === 'upsert') {
    next.where = { ...asRecord(next.where), tenantId };
    next.create = { ...asRecord(next.create), tenantId };
    next.update = asRecord(stripTenantId(next.update));
  }
  if (operation === 'update' || operation === 'updateMany' || operation === 'updateManyAndReturn') {
    next.data = stripTenantId(next.data);
  }
  return next;
}

async function runIsolatedUnique(
  base: PrismaClient,
  model: string,
  operation: string,
  args: QueryArgs,
  tenantId: string,
  query: (args: QueryArgs) => Promise<unknown>,
): Promise<unknown> {
  const delegate = (
    base as unknown as Record<string, { findFirst: (a: object) => Promise<{ id: string } | null> }>
  )[delegateName(model)];
  if (!delegate) {
    return query(args);
  }
  const existing = await delegate.findFirst({
    where: { ...asRecord(args.where), tenantId },
    select: { id: true },
  });
  if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
    if (!existing) {
      if (operation === 'findUniqueOrThrow') {
        throw new Prisma.PrismaClientKnownRequestError(`No ${model} found`, {
          code: 'P2025',
          clientVersion: Prisma.prismaVersion.client,
        });
      }
      return null;
    }
    return query({ ...args, where: { id: existing.id } });
  }
  if (!existing) {
    throw new Prisma.PrismaClientKnownRequestError(`No ${model} found`, {
      code: 'P2025',
      clientVersion: Prisma.prismaVersion.client,
    });
  }
  return query({
    ...args,
    where: { id: existing.id },
    data: operation === 'delete' ? args.data : stripTenantId(args.data),
  });
}

export function applyTenantExtension(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const ctx = getRequestContext();
          if (!ctx || ctx.bypassTenantScope || !ctx.tenantId || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }
          const scopedArgs = applyTenantToArgs(operation, (args ?? {}) as QueryArgs, ctx.tenantId);
          if (
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow' ||
            operation === 'update' ||
            operation === 'delete'
          ) {
            return runIsolatedUnique(base, model, operation, scopedArgs, ctx.tenantId, query);
          }
          return query(scopedArgs);
        },
      },
    },
  });
}

export type TenantScopedPrisma = ReturnType<typeof applyTenantExtension>;
