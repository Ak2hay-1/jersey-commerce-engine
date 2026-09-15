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
  'CustomerIdentity',
  'AuthSettings',
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
  'PromoCode',
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

type Delegate = {
  findFirst: (a: object) => Promise<{ id: string; tenantId?: string } | null>;
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

function notFound(model: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`No ${model} found`, {
    code: 'P2025',
    clientVersion: Prisma.prismaVersion.client,
  });
}

/**
 * Turn Prisma unique `where` inputs into a findFirst-compatible filter.
 * Supports `{ id }` and compound unique bags like `{ tenantId_keyHash: { tenantId, keyHash } }`.
 */
export function flattenUniqueWhere(where: Record<string, unknown>, tenantId: string): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (typeof where.id === 'string') {
    flat.id = where.id;
  }
  for (const [key, value] of Object.entries(where)) {
    if (key === 'id' || key === 'tenantId') {
      continue;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flat, value);
    } else {
      flat[key] = value;
    }
  }
  flat.tenantId = tenantId;
  return flat;
}

async function runIsolatedUnique(
  base: PrismaClient,
  model: string,
  operation: string,
  args: QueryArgs,
  tenantId: string,
  query: (args: QueryArgs) => Promise<unknown>,
): Promise<unknown> {
  const delegate = (base as unknown as Record<string, Delegate | undefined>)[delegateName(model)];
  if (!delegate) {
    return query(args);
  }

  const where = asRecord(args.where);
  const tenantWhere = flattenUniqueWhere(where, tenantId);

  // Outer client only sees committed rows — fine for normal reads/updates.
  const existingForTenant = await delegate.findFirst({
    where: tenantWhere,
    select: { id: true },
  });

  if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
    if (!existingForTenant) {
      if (operation === 'findUniqueOrThrow') {
        throw notFound(model);
      }
      return null;
    }
    return query({ ...args, where: { id: existingForTenant.id } });
  }

  // update / delete of a committed row
  if (existingForTenant) {
    return query({
      ...args,
      where: { id: existingForTenant.id },
      data: operation === 'delete' ? args.data : stripTenantId(args.data),
    });
  }

  // Not visible on the outer client. The row may have been created in the same
  // interactive transaction (e.g. order.create → order.update). Falling through
  // is only safe when no committed row exists for this unique key at all.
  const committedAnyTenant = await delegate.findFirst({
    where: (() => {
      const probe = { ...tenantWhere };
      delete probe.tenantId;
      return probe;
    })(),
    select: { id: true, tenantId: true },
  });
  if (committedAnyTenant) {
    throw notFound(model);
  }

  const result = await query({
    ...args,
    where: typeof where.id === 'string' ? { id: where.id } : where,
    data: operation === 'delete' ? args.data : stripTenantId(args.data),
  });

  if (
    result &&
    typeof result === 'object' &&
    'tenantId' in result &&
    (result as { tenantId: string }).tenantId !== tenantId
  ) {
    throw notFound(model);
  }

  return result;
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
