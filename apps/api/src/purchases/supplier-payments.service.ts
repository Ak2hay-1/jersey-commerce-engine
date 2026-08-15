import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma, PurchaseStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { normalizeOptionalText } from '../catalog/unique';
import type { AuthPrincipal } from '../common/context/request-context';
import { money, moneyString, outstandingAmount, PAYABLE_PURCHASE_STATUSES } from './purchase-money';
import { toSupplierPaymentDto } from './purchasing.mapper';
import type { CreateSupplierPaymentDto, SupplierPaymentQueryDto } from './dto/supplier-payment.dto';

const TX_OPTIONS = {
  maxWait: 5_000,
  timeout: 15_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

@Injectable()
export class SupplierPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(tenantId: string, query: SupplierPaymentQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const createdAt = this.dateRange(query.from, query.to);
    const where: Prisma.SupplierPaymentWhereInput = {
      tenantId,
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.purchaseId ? { purchaseId: query.purchaseId } : {}),
      ...(query.paymentMethod ? { method: query.paymentMethod } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.supplierPayment.findMany({
        where,
        include: { supplier: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.supplierPayment.count({ where }),
    ]);
    return {
      items: records.map(toSupplierPaymentDto),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async create(tenantId: string, dto: CreateSupplierPaymentDto, actor: AuthPrincipal) {
    const amount = money(dto.amount);
    if (!amount.gt(0)) {
      throw new BadRequestException('Payment amount must be greater than 0.');
    }
    return this.prisma.$transaction(async (tx) => {
      const supplier = await asTx(tx).supplier.findFirst({ where: { id: dto.supplierId, tenantId } });
      assertFound(supplier, 'Supplier not found');
      const tenant = await asTx(tx).tenant.findFirstOrThrow({
        where: { id: tenantId },
        select: { allowSupplierOverpay: true },
      });

      if (dto.purchaseId) {
        const purchase = assertFound(
          await asTx(tx).purchase.findFirst({
            where: { id: dto.purchaseId, tenantId },
            select: { id: true, supplierId: true, status: true, total: true },
          }),
          'Purchase not found',
        );
        if (purchase.supplierId !== dto.supplierId) {
          throw new BadRequestException('Purchase does not belong to this supplier.');
        }
        if (purchase.status === PurchaseStatus.CANCELLED) {
          throw new ConflictException('Cancelled purchases cannot receive payment.');
        }
        if (purchase.status === PurchaseStatus.DRAFT) {
          throw new ConflictException('Draft purchases cannot receive payment until they are ordered.');
        }
        const paid = await this.sumPayments(tx, tenantId, { purchaseId: purchase.id });
        const outstanding = outstandingAmount(money(purchase.total.toString()), paid);
        if (amount.gt(outstanding) && !tenant.allowSupplierOverpay) {
          throw new BadRequestException(
            `Payment amount cannot exceed the purchase outstanding balance (${moneyString(outstanding)}).`,
          );
        }
      } else {
        const payable = await this.sumPurchases(tx, tenantId, dto.supplierId);
        const paid = await this.sumPayments(tx, tenantId, { supplierId: dto.supplierId });
        const outstanding = outstandingAmount(payable, paid);
        if (amount.gt(outstanding) && !tenant.allowSupplierOverpay) {
          throw new BadRequestException(
            `Payment amount cannot exceed the supplier outstanding balance (${moneyString(outstanding)}).`,
          );
        }
      }

      const created = await asTx(tx).supplierPayment.create({
        data: {
          tenantId,
          supplierId: dto.supplierId,
          purchaseId: dto.purchaseId ?? null,
          amount,
          method: dto.paymentMethod,
          status: PaymentStatus.COMPLETED,
          reference: normalizeOptionalText(dto.reference),
          notes: normalizeOptionalText(dto.notes),
          createdById: actor.userId,
        },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.SUPPLIER_PAYMENT_CREATED,
          tenantId,
          userId: actor.userId,
          entity: 'SupplierPayment',
          entityId: created.id,
          newValue: {
            supplierId: dto.supplierId,
            purchaseId: dto.purchaseId ?? null,
            amount: moneyString(amount),
            paymentMethod: dto.paymentMethod,
            reference: created.reference,
          },
        },
        tx,
      );
      return toSupplierPaymentDto(created);
    }, TX_OPTIONS);
  }

  private sumPayments(
    tx: object,
    tenantId: string,
    filter: { purchaseId?: string; supplierId?: string },
  ) {
    return asTx(tx)
      .supplierPayment.aggregate({
        where: {
          tenantId,
          status: PaymentStatus.COMPLETED,
          ...(filter.purchaseId ? { purchaseId: filter.purchaseId } : {}),
          ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
        },
        _sum: { amount: true },
      })
      .then((result) => money(result._sum.amount?.toString() ?? '0'));
  }

  private sumPurchases(tx: object, tenantId: string, supplierId: string) {
    return asTx(tx)
      .purchase.aggregate({
        where: { tenantId, supplierId, status: { in: PAYABLE_PURCHASE_STATUSES } },
        _sum: { total: true },
      })
      .then((result) => money(result._sum.total?.toString() ?? '0'));
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
}
