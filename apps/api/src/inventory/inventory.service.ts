import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, InventoryMovementType, Prisma, VariantStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { normalizeBarcode, normalizeSku } from '../catalog/unique';
import { moneyString } from '../catalog/money';
import type { RequestMeta } from '../auth/auth-session.service';
import type { InventoryQueryDto, InventoryMovementQueryDto } from './dto/inventory-query.dto';
import type {
  AdjustInventoryDto,
  OpeningStockDto,
  ReleaseStockDto,
  ReorderLevelDto,
  ReserveStockDto,
} from './dto/inventory-mutations.dto';
import {
  inventoryDetailInclude,
  movementInclude,
  toInventoryDetail,
  toInventoryListItem,
  toLookupItem,
  toMovementItem,
  type InventoryRecord,
  type MovementRecord,
} from './inventory.mapper';
import { assertInventoryInvariants, availableQuantity, stockStatus, type LockedInventoryRow } from './inventory-math';

export type InventoryTx = Prisma.TransactionClient;
export type DbClient = object;

export interface InventoryActor {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface InventoryAvailability {
  productVariantId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  stockStatus: ReturnType<typeof stockStatus>;
  quantityOnHand: number;
  quantityReserved: number;
}

export interface ApplyMovementInput {
  tenantId: string;
  productVariantId: string;
  quantity: number;
  type: InventoryMovementType;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  createdBy?: string;
  allowNegative?: boolean;
  allowArchived?: boolean;
  skipAudit?: boolean;
  actor?: InventoryActor;
  /** When set, stored on the movement instead of the current catalog costPrice. */
  unitCost?: Prisma.Decimal | string | number | null;
}

interface MutateStockInput {
  tenantId: string;
  productVariantId: string;
  quantityDelta: number;
  reservedDelta: number;
  type?: InventoryMovementType;
  reason?: string;
  requireReason?: boolean;
  referenceType?: string;
  referenceId?: string;
  createdBy?: string;
  allowArchived?: boolean;
  sellableOnly?: boolean;
  skipAudit?: boolean;
  auditAction?: string;
  actor?: InventoryActor;
  meta?: RequestMeta;
  unitCost?: Prisma.Decimal | string | number | null;
}

interface StockSnapshot {
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
}

const TX_OPTIONS = {
  maxWait: 5_000,
  timeout: 15_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

function requireReason(reason: string | undefined, label = 'A reason is required for this inventory change.'): string {
  const trimmed = reason?.trim() ?? '';
  if (!trimmed) {
    throw new BadRequestException(label);
  }
  return trimmed;
}

function snapshotFromLock(row: LockedInventoryRow): StockSnapshot {
  return {
    quantity: row.quantity,
    reservedQuantity: row.reserved_quantity,
    availableQuantity: availableQuantity(row.quantity, row.reserved_quantity),
    reorderLevel: row.reorder_level,
  };
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(tenantId: string, query: InventoryQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = await this.buildListWhere(tenantId, query);
    const orderBy = this.listOrder(query.sort);
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        include: inventoryDetailInclude,
        orderBy,
        skip,
        take,
      }),
      this.prisma.inventory.count({ where }),
    ]);
    return {
      items: (rows as InventoryRecord[]).map(toInventoryListItem),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async summary(tenantId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        totalVariants: number;
        totalUnits: number;
        reservedUnits: number;
        outOfStockVariants: number;
        lowStockVariants: number;
        inventoryValue: Prisma.Decimal | string | number | null;
      }>
    >`
      SELECT
        COUNT(*)::int AS "totalVariants",
        COALESCE(SUM(i.quantity), 0)::int AS "totalUnits",
        COALESCE(SUM(i.reserved_quantity), 0)::int AS "reservedUnits",
        COUNT(*) FILTER (WHERE i.quantity = 0)::int AS "outOfStockVariants",
        COUNT(*) FILTER (
          WHERE i.reorder_level > 0 AND i.quantity > 0 AND i.quantity <= i.reorder_level
        )::int AS "lowStockVariants",
        COALESCE(SUM(i.quantity * pv.cost_price), 0) AS "inventoryValue"
      FROM inventories i
      INNER JOIN product_variants pv ON pv.id = i.product_variant_id
      WHERE i.tenant_id = ${tenantId}
    `;
    const row = rows[0] ?? {
      totalVariants: 0,
      totalUnits: 0,
      reservedUnits: 0,
      outOfStockVariants: 0,
      lowStockVariants: 0,
      inventoryValue: 0,
    };
    return {
      totalVariants: Number(row.totalVariants),
      totalUnits: Number(row.totalUnits),
      reservedUnits: Number(row.reservedUnits),
      outOfStockVariants: Number(row.outOfStockVariants),
      lowStockVariants: Number(row.lowStockVariants),
      inventoryValue: this.toMoney(row.inventoryValue),
    };
  }

  async findByVariantId(tenantId: string, productVariantId: string) {
    await this.requireVariant(tenantId, productVariantId);
    const record = await this.loadRecord(tenantId, productVariantId);
    return toInventoryDetail(record);
  }

  async getStock(tenantId: string, productVariantId: string) {
    return this.findByVariantId(tenantId, productVariantId);
  }

  async getAvailableStock(tenantId: string, productVariantId: string): Promise<number> {
    const availability = await this.getAvailability(tenantId, productVariantId);
    return availability.availableQuantity;
  }

  async getAvailability(tenantId: string, productVariantId: string): Promise<InventoryAvailability> {
    const record = await this.prisma.inventory.findFirst({
      where: { tenantId, productVariantId },
    });
    const quantity = record?.quantity ?? 0;
    const reservedQuantity = record?.reservedQuantity ?? 0;
    const reorderLevel = record?.reorderLevel ?? 0;
    const available = availableQuantity(quantity, reservedQuantity);
    return {
      productVariantId,
      quantity,
      reservedQuantity,
      availableQuantity: available,
      reorderLevel,
      stockStatus: stockStatus(quantity, reorderLevel),
      quantityOnHand: quantity,
      quantityReserved: reservedQuantity,
    };
  }

  async getMovementHistory(tenantId: string, productVariantId: string, query: InventoryMovementQueryDto) {
    await this.requireVariant(tenantId, productVariantId);
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) {
      createdAt.gte = new Date(query.from);
    }
    if (query.to) {
      createdAt.lte = new Date(query.to);
    }
    const search = query.search?.trim();
    const where: Prisma.InventoryMovementWhereInput = {
      tenantId,
      productVariantId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { reason: { contains: search, mode: 'insensitive' } },
              { referenceId: { contains: search, mode: 'insensitive' } },
              { referenceType: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        include: movementInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return {
      items: (rows as MovementRecord[]).map(toMovementItem),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async lookupByBarcode(tenantId: string, barcode: string) {
    const normalized = normalizeBarcode(barcode);
    if (!normalized) {
      throw new BadRequestException('Barcode is required.');
    }
    const variant = await this.prisma.productVariant.findFirst({
      where: { tenantId, barcode: normalized },
      select: { id: true },
    });
    if (!variant) {
      throw new NotFoundException('No inventory matches this barcode.');
    }
    const record = await this.loadRecord(tenantId, variant.id);
    return toLookupItem(record);
  }

  async lookupBySku(tenantId: string, sku: string) {
    const normalized = normalizeSku(sku);
    const variant = await this.prisma.productVariant.findFirst({
      where: { tenantId, sku: normalized },
      select: { id: true },
    });
    if (!variant) {
      throw new NotFoundException('No inventory matches this SKU.');
    }
    const record = await this.loadRecord(tenantId, variant.id);
    return toLookupItem(record);
  }

  async ensureRecord(tenantId: string, productVariantId: string, db: object = this.prisma) {
    const client = asTx(db);
    const existing = await client.inventory.findFirst({ where: { tenantId, productVariantId } });
    if (existing) {
      return existing;
    }
    try {
      return await client.inventory.create({
        data: {
          tenantId,
          productVariantId,
          quantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          reorderLevel: 0,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await client.inventory.findFirst({ where: { tenantId, productVariantId } });
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  async lockRecord(tx: object, tenantId: string, productVariantId: string): Promise<LockedInventoryRow> {
    const client = asTx(tx);
    await this.ensureRecord(tenantId, productVariantId, client);
    const rows = await client.$queryRaw<LockedInventoryRow[]>`
      SELECT id, tenant_id, product_variant_id, quantity, reserved_quantity, available_quantity, reorder_level
      FROM inventories
      WHERE tenant_id = ${tenantId} AND product_variant_id = ${productVariantId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Inventory record not found');
    }
    return {
      ...row,
      quantity: Number(row.quantity),
      reserved_quantity: Number(row.reserved_quantity),
      available_quantity: Number(row.available_quantity),
      reorder_level: Number(row.reorder_level),
    };
  }

  async increaseStock(
    input: Omit<ApplyMovementInput, 'quantity'> & { quantity: number },
    tx?: object,
  ) {
    if (input.quantity <= 0) {
      throw new BadRequestException('Increase quantity must be a positive integer.');
    }
    return this.applySignedChange({ ...input, quantity: input.quantity }, tx);
  }

  async decreaseStock(
    input: Omit<ApplyMovementInput, 'quantity'> & { quantity: number },
    tx?: object,
  ) {
    if (input.quantity <= 0) {
      throw new BadRequestException('Decrease quantity must be a positive integer.');
    }
    const sellable =
      input.type === InventoryMovementType.SALE || input.type === InventoryMovementType.ONLINE_ORDER;
    return this.applySignedChange(
      { ...input, quantity: -input.quantity, sellableOnly: input.allowArchived ? false : sellable },
      tx,
    );
  }

  async adjustStock(tenantId: string, dto: AdjustInventoryDto, actor: InventoryActor, meta?: RequestMeta, tx?: object) {
    const type = dto.type === 'DAMAGE' ? InventoryMovementType.DAMAGE : InventoryMovementType.ADJUSTMENT;
    if (type === InventoryMovementType.DAMAGE && dto.quantity >= 0) {
      throw new BadRequestException('Damage adjustments must use a negative quantity.');
    }
    return this.withTransaction(tx, async (client) => {
      const mutated = await this.mutateStock(client, {
        tenantId,
        productVariantId: dto.productVariantId,
        quantityDelta: dto.quantity,
        reservedDelta: 0,
        type,
        reason: requireReason(dto.reason),
        requireReason: true,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdBy: actor.userId,
        allowArchived: true,
        skipAudit: false,
        auditAction: type === InventoryMovementType.DAMAGE ? AUDIT_ACTIONS.INVENTORY_DAMAGED : AUDIT_ACTIONS.INVENTORY_ADJUSTED,
        actor,
        meta,
      });
      return this.resultFromTx(client, tenantId, dto.productVariantId, mutated.movementId);
    });
  }

  async setOpeningStock(tenantId: string, dto: OpeningStockDto, actor: InventoryActor, meta?: RequestMeta) {
    return this.withTransaction(undefined, async (client) => {
      const existingOpening = await client.inventoryMovement.findFirst({
        where: { tenantId, productVariantId: dto.productVariantId, type: InventoryMovementType.OPENING_STOCK },
        select: { id: true },
      });
      if (existingOpening) {
        throw new ConflictException(
          'Opening stock already exists for this variant. Use a stock adjustment to correct quantity.',
        );
      }
      await this.requireVariant(tenantId, dto.productVariantId, client, { allowArchived: false });
      const locked = await this.lockRecord(client, tenantId, dto.productVariantId);
      if (locked.quantity !== 0 || locked.reserved_quantity !== 0) {
        throw new ConflictException(
          'Opening stock can only be recorded when current quantity and reserved quantity are zero.',
        );
      }
      if (dto.reorderLevel !== undefined) {
        await client.inventory.update({
          where: { id: locked.id },
          data: { reorderLevel: dto.reorderLevel },
        });
      }
      const mutated = await this.mutateStock(client, {
        tenantId,
        productVariantId: dto.productVariantId,
        quantityDelta: dto.quantity,
        reservedDelta: 0,
        type: InventoryMovementType.OPENING_STOCK,
        reason: requireReason(dto.reason),
        requireReason: true,
        createdBy: actor.userId,
        allowArchived: false,
        auditAction: AUDIT_ACTIONS.INVENTORY_OPENING_STOCK,
        actor,
        meta,
      });
      return this.resultFromTx(client, tenantId, dto.productVariantId, mutated.movementId);
    });
  }

  async reserveStock(
    tenantId: string,
    productVariantId: string,
    dto: ReserveStockDto,
    actor: InventoryActor,
    meta?: RequestMeta,
    tx?: object,
  ) {
    return this.withTransaction(tx, async (client) => {
      const mutated = await this.mutateStock(client, {
        tenantId,
        productVariantId,
        quantityDelta: 0,
        reservedDelta: dto.quantity,
        reason: requireReason(dto.reason),
        requireReason: true,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdBy: actor.userId,
        sellableOnly: true,
        auditAction: AUDIT_ACTIONS.INVENTORY_RESERVED,
        actor,
        meta,
      });
      return this.resultFromTx(client, tenantId, productVariantId, mutated.movementId);
    });
  }

  async releaseStock(
    tenantId: string,
    productVariantId: string,
    dto: ReleaseStockDto,
    actor: InventoryActor,
    meta?: RequestMeta,
    tx?: object,
  ) {
    return this.withTransaction(tx, async (client) => {
      const mutated = await this.mutateStock(client, {
        tenantId,
        productVariantId,
        quantityDelta: 0,
        reservedDelta: -dto.quantity,
        reason: requireReason(dto.reason),
        requireReason: true,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdBy: actor.userId,
        allowArchived: true,
        auditAction: AUDIT_ACTIONS.INVENTORY_RELEASED,
        actor,
        meta,
      });
      return this.resultFromTx(client, tenantId, productVariantId, mutated.movementId);
    });
  }

  async consumeReservedStock(
    input: Omit<ApplyMovementInput, 'quantity'> & { quantity: number },
    tx?: object,
  ) {
    if (input.quantity <= 0) {
      throw new BadRequestException('Consumed quantity must be a positive integer.');
    }
    const type = input.type ?? InventoryMovementType.ONLINE_ORDER;
    return this.withTransaction(tx, async (client) => {
      const mutated = await this.mutateStock(client, {
        tenantId: input.tenantId,
        productVariantId: input.productVariantId,
        quantityDelta: -input.quantity,
        reservedDelta: -input.quantity,
        type,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy ?? input.actor?.userId,
        sellableOnly: !input.allowArchived,
        skipAudit: input.skipAudit ?? true,
        actor: input.actor,
      });
      return this.movementResult(client, input.tenantId, input.productVariantId, mutated);
    });
  }

  async setReorderLevel(
    tenantId: string,
    productVariantId: string,
    dto: ReorderLevelDto,
    actor: InventoryActor,
    meta?: RequestMeta,
  ) {
    return this.withTransaction(undefined, async (client) => {
      await this.requireVariant(tenantId, productVariantId, client, { allowArchived: true });
      const locked = await this.lockRecord(client, tenantId, productVariantId);
      const previous = locked.reorder_level;
      await client.inventory.update({
        where: { id: locked.id },
        data: { reorderLevel: dto.reorderLevel },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.INVENTORY_REORDER_UPDATED,
          tenantId,
          userId: actor.userId,
          entity: 'Inventory',
          entityId: locked.id,
          oldValue: { reorderLevel: previous },
          newValue: { reorderLevel: dto.reorderLevel },
          metadata: { productVariantId },
          ipAddress: meta?.ipAddress ?? actor.ipAddress,
          userAgent: meta?.userAgent ?? actor.userAgent,
        },
        client,
      );
      return this.loadRecord(tenantId, productVariantId, client).then(toInventoryDetail);
    });
  }

  async applySale(tx: object, input: Omit<ApplyMovementInput, 'type' | 'quantity'> & { quantity: number }) {
    if (input.quantity <= 0) {
      throw new ConflictException('Sale quantity must be positive.');
    }
    return this.applyMovement(asTx(tx), {
      ...input,
      quantity: -input.quantity,
      type: InventoryMovementType.SALE,
      skipAudit: true,
    });
  }

  async applyPurchase(tx: object, input: Omit<ApplyMovementInput, 'type' | 'quantity'> & { quantity: number }) {
    if (input.quantity <= 0) {
      throw new ConflictException('Purchase quantity must be positive.');
    }
    return this.applyMovement(asTx(tx), {
      ...input,
      quantity: input.quantity,
      type: InventoryMovementType.PURCHASE,
      skipAudit: true,
      allowArchived: input.allowArchived ?? true,
      referenceType: input.referenceType ?? 'PURCHASE',
    });
  }

  async applyReturn(tx: object, input: Omit<ApplyMovementInput, 'type' | 'quantity'> & { quantity: number }) {
    if (input.quantity <= 0) {
      throw new ConflictException('Return quantity must be positive.');
    }
    return this.applyMovement(asTx(tx), {
      ...input,
      quantity: input.quantity,
      type: InventoryMovementType.RETURN,
      skipAudit: true,
      allowArchived: true,
    });
  }

  async applyDamageWriteOff(tx: object, input: Omit<ApplyMovementInput, 'type' | 'quantity'> & { quantity: number }) {
    if (input.quantity <= 0) {
      throw new ConflictException('Damage quantity must be positive.');
    }
    return this.applyMovement(asTx(tx), {
      ...input,
      quantity: -input.quantity,
      type: InventoryMovementType.DAMAGE,
      skipAudit: true,
      allowArchived: true,
    });
  }

  async applyMovement(tx: InventoryTx, input: ApplyMovementInput) {
    if (!Number.isInteger(input.quantity) || input.quantity === 0) {
      throw new ConflictException('Inventory movement quantity must be a non-zero integer.');
    }
    const sellable =
      !input.allowArchived &&
      (input.type === InventoryMovementType.SALE || input.type === InventoryMovementType.ONLINE_ORDER);
    const mutated = await this.mutateStock(tx, {
      tenantId: input.tenantId,
      productVariantId: input.productVariantId,
      quantityDelta: input.quantity,
      reservedDelta: 0,
      type: input.type,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdBy: input.createdBy ?? input.actor?.userId,
      allowArchived: input.allowArchived,
      sellableOnly: sellable,
      skipAudit: input.skipAudit ?? true,
      actor: input.actor,
      unitCost: input.unitCost,
    });
    return this.movementResult(tx, input.tenantId, input.productVariantId, mutated);
  }

  private applySignedChange(
    input: ApplyMovementInput & { sellableOnly?: boolean },
    tx?: object,
  ) {
    return this.withTransaction(tx, async (client) => {
      const mutated = await this.mutateStock(client, {
        tenantId: input.tenantId,
        productVariantId: input.productVariantId,
        quantityDelta: input.quantity,
        reservedDelta: 0,
        type: input.type,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy ?? input.actor?.userId,
        allowArchived: input.allowArchived,
        sellableOnly: input.sellableOnly,
        skipAudit: input.skipAudit ?? true,
        actor: input.actor,
        unitCost: input.unitCost,
      });
      return this.movementResult(client, input.tenantId, input.productVariantId, mutated);
    });
  }

  private async mutateStock(tx: object, input: MutateStockInput) {
    const client = asTx(tx);
    if (!Number.isInteger(input.quantityDelta) || !Number.isInteger(input.reservedDelta)) {
      throw new BadRequestException('Stock deltas must be integers.');
    }
    if (input.quantityDelta === 0 && input.reservedDelta === 0) {
      throw new BadRequestException('Inventory change cannot be zero.');
    }
    const reason = input.requireReason ? requireReason(input.reason) : input.reason?.trim() || undefined;
    const variant = await this.requireVariant(input.tenantId, input.productVariantId, client, {
      allowArchived: input.allowArchived,
      sellableOnly: input.sellableOnly,
    });
    const locked = await this.lockRecord(client, input.tenantId, input.productVariantId);
    const previous = snapshotFromLock(locked);
    const nextQuantity = previous.quantity + input.quantityDelta;
    const nextReserved = previous.reservedQuantity + input.reservedDelta;
    let nextAvailable: number;
    try {
      nextAvailable = assertInventoryInvariants(nextQuantity, nextReserved);
    } catch (error) {
      if (input.reservedDelta > 0) {
        throw new ConflictException('Cannot reserve more than available stock.');
      }
      if (input.reservedDelta < 0) {
        throw new ConflictException('Cannot release more than the reserved quantity.');
      }
      if (input.quantityDelta < 0) {
        throw new ConflictException('Insufficient available stock for this variant.');
      }
      throw error;
    }

    const updated = await client.inventory.update({
      where: { id: locked.id },
      data: {
        quantity: nextQuantity,
        reservedQuantity: nextReserved,
        availableQuantity: nextAvailable,
      },
    });

    let movementId: string | null = null;
    if (input.quantityDelta !== 0) {
      if (!input.type) {
        throw new BadRequestException('A movement type is required when on-hand quantity changes.');
      }
      const movement = await client.inventoryMovement.create({
        data: {
          tenantId: input.tenantId,
          productVariantId: input.productVariantId,
          quantity: input.quantityDelta,
          type: input.type,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          reason,
          unitCost: input.unitCost == null ? variant.costPrice : new Prisma.Decimal(String(input.unitCost)),
          createdBy: input.createdBy,
        },
      });
      movementId = movement.id;
    }

    if (!input.skipAudit && input.auditAction) {
      await this.audit.log(
        {
          action: input.auditAction,
          tenantId: input.tenantId,
          userId: input.createdBy,
          entity: 'Inventory',
          entityId: updated.id,
          oldValue: { ...previous },
          newValue: {
            quantity: nextQuantity,
            reservedQuantity: nextReserved,
            availableQuantity: nextAvailable,
            reorderLevel: updated.reorderLevel,
            adjustment: input.quantityDelta,
            reservedAdjustment: input.reservedDelta,
          },
          metadata: {
            productVariantId: input.productVariantId,
            sku: variant.sku,
            reason,
            movementType: input.type,
            referenceType: input.referenceType,
            referenceId: input.referenceId,
          },
          ipAddress: input.meta?.ipAddress ?? input.actor?.ipAddress,
          userAgent: input.meta?.userAgent ?? input.actor?.userAgent,
        },
        client,
      );
    }

    return {
      inventoryId: updated.id,
      movementId,
      previous,
      next: {
        quantity: nextQuantity,
        reservedQuantity: nextReserved,
        availableQuantity: nextAvailable,
        reorderLevel: updated.reorderLevel,
      },
    };
  }

  private async movementResult(
    tx: object,
    tenantId: string,
    productVariantId: string,
    mutated: { previous: StockSnapshot; next: StockSnapshot; movementId: string | null },
  ) {
    const client = asTx(tx);
    const movement = mutated.movementId
      ? await client.inventoryMovement.findFirst({
          where: { id: mutated.movementId, tenantId },
          include: movementInclude,
        })
      : null;
    return {
      previous: {
        ...mutated.previous,
        quantityOnHand: mutated.previous.quantity,
        quantityReserved: mutated.previous.reservedQuantity,
      },
      next: {
        ...mutated.next,
        quantityOnHand: mutated.next.quantity,
        quantityReserved: mutated.next.reservedQuantity,
      },
      movement,
    };
  }

  private async resultFromTx(
    tx: object,
    tenantId: string,
    productVariantId: string,
    movementId: string | null,
  ) {
    const client = asTx(tx);
    const inventory = toInventoryDetail(await this.loadRecord(tenantId, productVariantId, client));
    const movement = movementId
      ? toMovementItem(
          (await client.inventoryMovement.findFirstOrThrow({
            where: { id: movementId, tenantId },
            include: movementInclude,
          })) as MovementRecord,
        )
      : null;
    return { inventory, movement };
  }

  private async loadRecord(tenantId: string, productVariantId: string, db: InventoryTx = asTx(this.prisma)) {
    await this.ensureRecord(tenantId, productVariantId, db);
    const record = await db.inventory.findFirst({
      where: { tenantId, productVariantId },
      include: inventoryDetailInclude,
    });
    if (!record) {
      throw new NotFoundException('Inventory record not found');
    }
    return record as InventoryRecord;
  }

  private async requireVariant(
    tenantId: string,
    productVariantId: string,
    db: InventoryTx = asTx(this.prisma),
    options: { allowArchived?: boolean; sellableOnly?: boolean } = {},
  ) {
    const variant = await db.productVariant.findFirst({
      where: { id: productVariantId, tenantId },
      include: { product: { select: { id: true, status: true, name: true } } },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    const archived = variant.product.status === CatalogStatus.ARCHIVED || variant.status === VariantStatus.INACTIVE;
    if (options.sellableOnly && (archived || variant.product.status !== CatalogStatus.ACTIVE)) {
      throw new BadRequestException(
        'Archived or inactive products cannot receive sales stock until they are reactivated.',
      );
    }
    if (!options.allowArchived && !options.sellableOnly && archived) {
      throw new BadRequestException(
        'Archived products cannot receive new stock until they are reactivated.',
      );
    }
    return variant;
  }

  private async withTransaction<T>(
    tx: object | undefined,
    fn: (client: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (tx) {
      return fn(asTx(tx));
    }
    return this.prisma.$transaction((client) => fn(asTx(client)), TX_OPTIONS);
  }

  private toMoney(value: Prisma.Decimal | string | number | null | undefined): string {
    if (value == null) {
      return '0.00';
    }
    return moneyString(typeof value === 'object' ? value : new Prisma.Decimal(String(value))) ?? '0.00';
  }

  private async buildListWhere(tenantId: string, query: InventoryQueryDto): Promise<Prisma.InventoryWhereInput> {
    const search = query.search?.trim();
    const sku = query.sku ? normalizeSku(query.sku) : undefined;
    const barcode = query.barcode ? normalizeBarcode(query.barcode) : undefined;
    const variantFilters: Prisma.ProductVariantWhereInput[] = [];
    if (sku) {
      variantFilters.push({ sku });
    }
    if (barcode) {
      variantFilters.push({ barcode });
    }
    if (query.productId) {
      variantFilters.push({ productId: query.productId });
    }
    if (query.categoryId) {
      const categoryIds = await this.categoryWithDescendants(tenantId, query.categoryId);
      variantFilters.push({ product: { categoryId: { in: categoryIds } } });
    }
    if (search) {
      variantFilters.push({
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { size: { contains: search, mode: 'insensitive' } },
          { color: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.InventoryWhereInput = {
      tenantId,
      ...(variantFilters.length > 0 ? { productVariant: { is: { AND: variantFilters } } } : {}),
    };

    if (query.lowStock) {
      const lowStockRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM inventories
        WHERE tenant_id = ${tenantId}
          AND reorder_level > 0
          AND quantity > 0
          AND quantity <= reorder_level
      `;
      const lowStockIds = lowStockRows.map((row) => row.id);
      if (query.outOfStock) {
        where.OR = [{ quantity: 0 }, { id: { in: lowStockIds } }];
      } else if (lowStockIds.length === 0) {
        where.id = { in: [] };
      } else {
        where.id = { in: lowStockIds };
      }
    } else if (query.outOfStock) {
      where.quantity = 0;
    }

    return where;
  }

  private listOrder(sort?: InventoryQueryDto['sort']): Prisma.InventoryOrderByWithRelationInput[] {
    switch (sort) {
      case 'quantity':
        return [{ quantity: 'asc' }, { updatedAt: 'desc' }];
      case 'available':
        return [{ availableQuantity: 'asc' }, { updatedAt: 'desc' }];
      case 'reserved':
        return [{ reservedQuantity: 'desc' }, { updatedAt: 'desc' }];
      case 'sku':
        return [{ productVariant: { sku: 'asc' } }];
      case 'product':
        return [{ productVariant: { product: { name: 'asc' } } }, { productVariant: { sku: 'asc' } }];
      default:
        return [{ updatedAt: 'desc' }];
    }
  }

  private async categoryWithDescendants(tenantId: string, categoryId: string): Promise<string[]> {
    const root = await this.prisma.category.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } });
    if (!root) {
      return [categoryId];
    }
    const ids = [root.id];
    let frontier = [root.id];
    for (let depth = 0; depth < 16 && frontier.length > 0; depth += 1) {
      const children = await this.prisma.category.findMany({
        where: { tenantId, parentId: { in: frontier } },
        select: { id: true },
      });
      frontier = children.map((child) => child.id).filter((id) => !ids.includes(id));
      ids.push(...frontier);
    }
    return ids;
  }
}
