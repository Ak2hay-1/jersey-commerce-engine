import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { PaymentStatus, Prisma, PurchaseStatus, VariantStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { InventoryService } from '../inventory/inventory.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { DOCUMENT_TYPES, nextDocumentNumber } from '../documents/document-sequence';
import type { AuthPrincipal } from '../common/context/request-context';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { normalizeOptionalText } from '../catalog/unique';
import {
  lineTotal,
  money,
  moneyString,
  parseNonNegativeMoney,
  purchaseTotals,
  remainingQuantity,
  statusAfterReceipt,
} from './purchase-money';
import {
  purchaseDetailInclude,
  purchaseListInclude,
  toPurchaseDetail,
  toPurchaseListItem,
  type PurchaseDetailRecord,
} from './purchasing.mapper';
import type {
  CancelPurchaseDto,
  CreatePurchaseDto,
  PurchaseItemInputDto,
  ReceivePurchaseDto,
  UpdatePurchaseDto,
} from './dto/purchase-mutations.dto';
import type { PurchaseQueryDto } from './dto/purchase-query.dto';

const TX_OPTIONS = {
  maxWait: 5_000,
  timeout: 20_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
    @Inject(forwardRef(() => SuppliersService)) private readonly suppliers: SuppliersService,
  ) {}

  async findAll(tenantId: string, query: PurchaseQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = this.listWhere(tenantId, query);
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: purchaseListInclude,
        orderBy: this.listOrder(query.sort),
        skip,
        take,
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return {
      items: records.map(toPurchaseListItem),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async findById(tenantId: string, id: string) {
    const record = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
      include: purchaseDetailInclude,
    });
    return toPurchaseDetail(assertFound(record, 'Purchase not found') as PurchaseDetailRecord);
  }

  async create(tenantId: string, dto: CreatePurchaseDto, actor: AuthPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      await this.suppliers.requireUsable(tenantId, dto.supplierId, tx);
      const prepared = await this.prepareItems(tx, tenantId, dto.items);
      const totals = purchaseTotals(
        prepared.map((item) => ({
          unitCost: item.unitCost,
          quantity: item.orderedQuantity,
          discount: item.discount,
          tax: item.tax,
        })),
        parseNonNegativeMoney(dto.discount, 'discount'),
        parseNonNegativeMoney(dto.tax, 'tax'),
      );
      const purchaseNumber = await nextDocumentNumber(tx, tenantId, DOCUMENT_TYPES.PURCHASE_ORDER);
      const created = await tx.purchase.create({
        data: {
          tenantId,
          supplierId: dto.supplierId,
          purchaseNumber,
          status: PurchaseStatus.DRAFT,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          notes: normalizeOptionalText(dto.notes),
          expectedDeliveryDate: this.parseOptionalDate(dto.expectedDeliveryDate),
          createdById: actor.userId,
          items: {
            create: prepared.map((item) => ({
              tenantId,
              productVariantId: item.productVariantId,
              orderedQuantity: item.orderedQuantity,
              receivedQuantity: 0,
              unitCost: item.unitCost,
              discount: item.discount,
              tax: item.tax,
              total: item.total,
            })),
          },
        },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.PURCHASE_CREATED,
          tenantId,
          userId: actor.userId,
          entity: 'Purchase',
          entityId: created.id,
          newValue: {
            purchaseNumber,
            supplierId: dto.supplierId,
            status: PurchaseStatus.DRAFT,
            total: moneyString(totals.total),
          },
        },
        tx,
      );
      const record = await tx.purchase.findFirstOrThrow({
        where: { id: created.id, tenantId },
        include: purchaseDetailInclude,
      });
      return toPurchaseDetail(record as PurchaseDetailRecord);
    }, TX_OPTIONS);
  }

  async update(tenantId: string, id: string, dto: UpdatePurchaseDto, actor: AuthPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.lockPurchase(tx, tenantId, id);
      if (existing.status !== PurchaseStatus.DRAFT) {
        throw new ConflictException('Only draft purchases can be modified.');
      }
      const supplierId = dto.supplierId ?? existing.supplierId;
      if (dto.supplierId) {
        await this.suppliers.requireUsable(tenantId, dto.supplierId, tx);
      }
      const itemInput = dto.items;
      const prepared =
        itemInput === undefined
          ? existing.items.map((item) => ({
              productVariantId: item.productVariantId,
              orderedQuantity: item.orderedQuantity,
              unitCost: money(item.unitCost.toString()),
              discount: money(item.discount.toString()),
              tax: money(item.tax.toString()),
              total: money(item.total.toString()),
            }))
          : await this.prepareItems(tx, tenantId, itemInput);
      const totals = purchaseTotals(
        prepared.map((item) => ({
          unitCost: item.unitCost,
          quantity: item.orderedQuantity,
          discount: item.discount,
          tax: item.tax,
        })),
        dto.discount === undefined ? money(existing.discount.toString()) : parseNonNegativeMoney(dto.discount, 'discount'),
        dto.tax === undefined ? money(existing.tax.toString()) : parseNonNegativeMoney(dto.tax, 'tax'),
      );
      if (itemInput) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId: existing.id, tenantId } });
        await tx.purchaseItem.createMany({
          data: prepared.map((item) => ({
            tenantId,
            purchaseId: existing.id,
            productVariantId: item.productVariantId,
            orderedQuantity: item.orderedQuantity,
            receivedQuantity: 0,
            unitCost: item.unitCost,
            discount: item.discount,
            tax: item.tax,
            total: item.total,
          })),
        });
      }
      await tx.purchase.update({
        where: { id: existing.id },
        data: {
          supplierId,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          notes: dto.notes === undefined ? existing.notes : normalizeOptionalText(dto.notes),
          expectedDeliveryDate:
            dto.expectedDeliveryDate === undefined
              ? existing.expectedDeliveryDate
              : this.parseOptionalDate(dto.expectedDeliveryDate),
        },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.PURCHASE_UPDATED,
          tenantId,
          userId: actor.userId,
          entity: 'Purchase',
          entityId: existing.id,
          oldValue: { total: moneyString(existing.total), supplierId: existing.supplierId },
          newValue: { total: moneyString(totals.total), supplierId },
        },
        tx,
      );
      const record = await tx.purchase.findFirstOrThrow({
        where: { id: existing.id, tenantId },
        include: purchaseDetailInclude,
      });
      return toPurchaseDetail(record as PurchaseDetailRecord);
    }, TX_OPTIONS);
  }

  async order(tenantId: string, id: string, actor: AuthPrincipal) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.lockPurchase(tx, tenantId, id);
      if (existing.status !== PurchaseStatus.DRAFT) {
        throw new ConflictException('Only draft purchases can be ordered.');
      }
      if (existing.items.length === 0) {
        throw new BadRequestException('A purchase must include at least one item.');
      }
      await this.suppliers.requireUsable(tenantId, existing.supplierId, tx);
      await tx.purchase.update({
        where: { id: existing.id },
        data: { status: PurchaseStatus.ORDERED, orderedAt: new Date() },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.PURCHASE_ORDERED,
          tenantId,
          userId: actor.userId,
          entity: 'Purchase',
          entityId: existing.id,
          oldValue: { status: existing.status },
          newValue: { status: PurchaseStatus.ORDERED, purchaseNumber: existing.purchaseNumber },
        },
        tx,
      );
      const record = await tx.purchase.findFirstOrThrow({
        where: { id: existing.id, tenantId },
        include: purchaseDetailInclude,
      });
      return toPurchaseDetail(record as PurchaseDetailRecord);
    }, TX_OPTIONS);
  }

  async receive(tenantId: string, id: string, dto: ReceivePurchaseDto, actor: AuthPrincipal) {
    const incoming = this.resolveReceiveItems(dto);
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.lockPurchase(tx, tenantId, id);
      if (existing.status === PurchaseStatus.CANCELLED) {
        throw new ConflictException('Cancelled purchases cannot be received.');
      }
      if (existing.status === PurchaseStatus.DRAFT) {
        throw new ConflictException('Draft purchases must be ordered before goods can be received.');
      }
      if (existing.status === PurchaseStatus.RECEIVED) {
        throw new ConflictException('This purchase has already been fully received.');
      }
      const tenant = await tx.tenant.findFirstOrThrow({
        where: { id: tenantId },
        select: { allowPurchaseOverReceive: true, updateVariantCostOnReceive: true },
      });
      const itemByVariant = new Map(existing.items.map((item) => [item.productVariantId, item]));
      const receivePlan = incoming.map((line) => {
        const item = itemByVariant.get(line.productVariantId);
        if (!item) {
          throw new BadRequestException('Received variant is not on this purchase.');
        }
        const remaining = remainingQuantity(item.orderedQuantity, item.receivedQuantity);
        if (line.receivedQuantity > remaining && !tenant.allowPurchaseOverReceive) {
          throw new BadRequestException(
            `Received quantity cannot exceed the remaining ordered quantity (${remaining}).`,
          );
        }
        return {
          item,
          receivedQuantity: line.receivedQuantity,
          previousReceived: item.receivedQuantity,
          nextReceived: item.receivedQuantity + line.receivedQuantity,
        };
      });

      const receipt = await tx.purchaseReceipt.create({
        data: {
          tenantId,
          purchaseId: existing.id,
          supplierId: existing.supplierId,
          notes: normalizeOptionalText(dto.notes ?? dto.reason),
          createdById: actor.userId,
          items: {
            create: receivePlan.map((line) => ({
              tenantId,
              purchaseItemId: line.item.id,
              productVariantId: line.item.productVariantId,
              quantity: line.receivedQuantity,
              unitCost: line.item.unitCost,
            })),
          },
        },
      });

      for (const line of receivePlan) {
        await tx.purchaseItem.update({
          where: { id: line.item.id },
          data: { receivedQuantity: line.nextReceived },
        });
        await this.inventory.applyPurchase(tx, {
          tenantId,
          productVariantId: line.item.productVariantId,
          quantity: line.receivedQuantity,
          unitCost: line.item.unitCost,
          referenceType: 'PURCHASE',
          referenceId: existing.id,
          reason: dto.notes ?? dto.reason ?? `Received ${existing.purchaseNumber}`,
          createdBy: actor.userId,
          actor: { userId: actor.userId },
        });
        if (tenant.updateVariantCostOnReceive) {
          await tx.productVariant.update({
            where: { id: line.item.productVariantId },
            data: { costPrice: line.item.unitCost },
          });
        }
      }

      const nextItems = existing.items.map((item) => {
        const received = receivePlan.find((line) => line.item.id === item.id);
        return received ? received.nextReceived : item.receivedQuantity;
      });
      const orderedTotal = existing.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
      const receivedTotal = existing.items.reduce((sum, item, index) => sum + (nextItems[index] ?? item.receivedQuantity), 0);
      const nextStatus = statusAfterReceipt(orderedTotal, receivedTotal);
      await tx.purchase.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          receivedAt: nextStatus === PurchaseStatus.RECEIVED ? new Date() : existing.receivedAt,
        },
      });

      await this.audit.log(
        {
          action: AUDIT_ACTIONS.PURCHASE_RECEIVED,
          tenantId,
          userId: actor.userId,
          entity: 'Purchase',
          entityId: existing.id,
          oldValue: { status: existing.status },
          newValue: { status: nextStatus, receiptId: receipt.id },
          metadata: {
            purchaseNumber: existing.purchaseNumber,
            items: receivePlan.map((line) => ({
              productVariantId: line.item.productVariantId,
              quantity: line.receivedQuantity,
              previousReceivedQuantity: line.previousReceived,
              newReceivedQuantity: line.nextReceived,
              unitCost: moneyString(line.item.unitCost),
            })),
          },
        },
        tx,
      );

      const record = await tx.purchase.findFirstOrThrow({
        where: { id: existing.id, tenantId },
        include: purchaseDetailInclude,
      });
      return toPurchaseDetail(record as PurchaseDetailRecord);
    }, TX_OPTIONS);
  }

  async cancel(tenantId: string, id: string, dto: CancelPurchaseDto, actor: AuthPrincipal) {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('A cancellation reason is required.');
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.lockPurchase(tx, tenantId, id);
      if (existing.status === PurchaseStatus.CANCELLED) {
        throw new ConflictException('This purchase is already cancelled.');
      }
      if (existing.status === PurchaseStatus.RECEIVED) {
        throw new ConflictException('Received purchases cannot be cancelled. Use a purchase return workflow.');
      }
      if (existing.status === PurchaseStatus.PARTIALLY_RECEIVED) {
        throw new ConflictException(
          'Partially received purchases cannot be cancelled. Preserve history and use an adjustment or future purchase return.',
        );
      }
      const receivedAny = existing.items.some((item) => item.receivedQuantity > 0);
      if (receivedAny) {
        throw new ConflictException('Purchases with received quantity cannot be cancelled.');
      }
      const paymentCount = await tx.supplierPayment.count({
        where: { tenantId, purchaseId: existing.id, status: PaymentStatus.COMPLETED },
      });
      if (paymentCount > 0) {
        throw new ConflictException('A purchase with supplier payments cannot be cancelled.');
      }
      await tx.purchase.update({
        where: { id: existing.id },
        data: {
          status: PurchaseStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: actor.userId,
          cancelReason: reason,
        },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.PURCHASE_CANCELLED,
          tenantId,
          userId: actor.userId,
          entity: 'Purchase',
          entityId: existing.id,
          oldValue: { status: existing.status },
          newValue: { status: PurchaseStatus.CANCELLED, reason },
          metadata: { purchaseNumber: existing.purchaseNumber },
        },
        tx,
      );
      const record = await tx.purchase.findFirstOrThrow({
        where: { id: existing.id, tenantId },
        include: purchaseDetailInclude,
      });
      return toPurchaseDetail(record as PurchaseDetailRecord);
    }, TX_OPTIONS);
  }

  private resolveReceiveItems(dto: ReceivePurchaseDto): Array<{ productVariantId: string; receivedQuantity: number }> {
    const fromArray = dto.items ?? [];
    const fromShorthand =
      dto.productVariantId && dto.receivedQuantity
        ? [{ productVariantId: dto.productVariantId, receivedQuantity: dto.receivedQuantity }]
        : [];
    const merged = [...fromArray, ...fromShorthand];
    if (merged.length === 0) {
      throw new BadRequestException('At least one received item is required.');
    }
    const byVariant = new Map<string, number>();
    for (const line of merged) {
      if (!Number.isInteger(line.receivedQuantity) || line.receivedQuantity <= 0) {
        throw new BadRequestException('Received quantity must be a positive integer.');
      }
      byVariant.set(line.productVariantId, (byVariant.get(line.productVariantId) ?? 0) + line.receivedQuantity);
    }
    return [...byVariant.entries()].map(([productVariantId, receivedQuantity]) => ({
      productVariantId,
      receivedQuantity,
    }));
  }

  private async prepareItems(tx: object, tenantId: string, items: PurchaseItemInputDto[]) {
    const seen = new Set<string>();
    const prepared = [];
    for (const item of items) {
      if (seen.has(item.productVariantId)) {
        throw new BadRequestException('Each product variant can appear only once on a purchase.');
      }
      seen.add(item.productVariantId);
      const variant = await asTx(tx).productVariant.findFirst({
        where: { id: item.productVariantId, tenantId },
        include: { product: { select: { id: true, status: true } } },
      });
      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }
      if (variant.status === VariantStatus.INACTIVE) {
        throw new BadRequestException('Inactive variants cannot be added to a purchase.');
      }
      const unitCost = parseNonNegativeMoney(item.unitCost, 'unitCost');
      const discount = parseNonNegativeMoney(item.discount, 'discount');
      const tax = parseNonNegativeMoney(item.tax, 'tax');
      prepared.push({
        productVariantId: item.productVariantId,
        orderedQuantity: item.orderedQuantity,
        unitCost,
        discount,
        tax,
        total: lineTotal(unitCost, item.orderedQuantity, discount, tax),
      });
    }
    return prepared;
  }

  private async lockPurchase(tx: object, tenantId: string, id: string) {
    const client = asTx(tx);
    const rows = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM purchases WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
    `;
    if (!rows[0]) {
      throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Purchase not found' });
    }
    const record = await client.purchase.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    return assertFound(record, 'Purchase not found');
  }

  private listWhere(tenantId: string, query: PurchaseQueryDto): Prisma.PurchaseWhereInput {
    const createdAt = this.dateRange(query.from, query.to);
    const search = query.search?.trim();
    const purchaseNumber = query.purchaseNumber?.trim();
    return {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(purchaseNumber ? { purchaseNumber: { contains: purchaseNumber, mode: 'insensitive' } } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { purchaseNumber: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
              { supplier: { is: { name: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
  }

  private listOrder(sort?: PurchaseQueryDto['sort']): Prisma.PurchaseOrderByWithRelationInput[] {
    switch (sort) {
      case 'purchaseNumber':
        return [{ purchaseNumber: 'asc' }];
      case 'total':
        return [{ total: 'desc' }];
      case 'status':
        return [{ status: 'asc' }, { createdAt: 'desc' }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  private dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return undefined;
    }
    const range: Prisma.DateTimeFilter = {};
    if (from) {
      const start = new Date(from);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('from must be a valid ISO date.');
      }
      range.gte = start;
    }
    if (to) {
      const end = new Date(to);
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('to must be a valid ISO date.');
      }
      range.lte = end;
    }
    return range;
  }

  private parseOptionalDate(value?: string | null): Date | null {
    if (value == null || value === '') {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('expectedDeliveryDate must be a valid ISO date.');
    }
    return parsed;
  }
}
