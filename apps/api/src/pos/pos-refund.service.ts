import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RefundStatus,
  RestockDisposition,
  SaleStatus,
} from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import { InventoryService } from '../inventory/inventory.service';
import { parseMoney } from '../catalog/money';
import { allocateProportional, unitShare } from '../finance/tax';
import { PaymentProcessor } from '../payments/payment-processor.service';
import { expectedCash, money, roundMoney } from './pos-money';
import { toSaleDto } from './pos.mapper';
import { PosSessionService } from './pos-session.service';
import type { RefundSaleDto } from './dto/refund.dto';

const reversalInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, name: true, email: true } },
  items: true,
  payments: true,
  refunds: { include: { items: true, payments: true } },
} satisfies Prisma.SaleInclude;

type SaleForReversal = Prisma.SaleGetPayload<{ include: typeof reversalInclude }>;

@Injectable()
export class PosRefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
    private readonly processor: PaymentProcessor,
    private readonly sessions: PosSessionService,
  ) {}

  async refund(actor: AuthPrincipal, saleId: string, dto: RefundSaleDto) {
    if (!actor.permissions.includes('sales.refund') || !actor.permissions.includes('payments.refund')) {
      await this.audit.log({
        action: AUDIT_ACTIONS.POS_REFUND_ATTEMPTED,
        tenantId: actor.tenantId,
        userId: actor.userId,
        entity: 'Sale',
        entityId: saleId,
        metadata: { reason: dto.reason },
      });
      throw new ForbiddenException('You do not have permission to refund sales.');
    }
    return this.prisma.$transaction(async (raw) => {
      const tx = asTx(raw);
      const sale = await this.lockSale(tx, actor.tenantId, saleId);
      if (sale.status !== SaleStatus.COMPLETED && sale.status !== SaleStatus.PARTIALLY_REFUNDED) {
        throw new ConflictException('Only a completed sale can be refunded.');
      }
      return this.apply(tx, actor, sale, dto, 'REFUND');
    });
  }

  async reverseForCancel(tx: Prisma.TransactionClient, actor: AuthPrincipal, sale: SaleForReversal, reason: string) {
    return this.apply(
      tx,
      actor,
      sale,
      { reason, confirmed: true },
      'CANCEL',
    );
  }

  async lockSale(tx: Prisma.TransactionClient, tenantId: string, saleId: string) {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM sales
      WHERE id = ${saleId} AND tenant_id = ${tenantId}
      FOR UPDATE
    `;
    if (!lockedRows[0]) {
      throw new NotFoundException('Sale not found');
    }
    return tx.sale.findFirstOrThrow({
      where: { id: saleId, tenantId },
      include: reversalInclude,
    });
  }

  private async apply(
    tx: Prisma.TransactionClient,
    actor: AuthPrincipal,
    sale: SaleForReversal,
    dto: RefundSaleDto,
    mode: 'REFUND' | 'CANCEL',
  ) {
    const remainingItems = this.remainingItems(sale);
    const requestedItems =
      dto.items && dto.items.length > 0
        ? dto.items.map((item) => ({
            saleItemId: item.saleItemId,
            quantity: item.quantity,
            restock: (item.restock ?? 'RESTOCK') as RestockDisposition,
          }))
        : remainingItems
            .filter((item) => item.remaining > 0)
            .map((item) => ({
              saleItemId: item.saleItem.id,
              quantity: item.remaining,
              restock: RestockDisposition.RESTOCK,
            }));
    if (requestedItems.length === 0) {
      throw new BadRequestException('There is nothing remaining to refund.');
    }

    const refundLines = requestedItems.map((requested) => {
      const match = remainingItems.find((item) => item.saleItem.id === requested.saleItemId);
      if (!match) {
        throw new BadRequestException('Refund item does not belong to this sale.');
      }
      if (requested.quantity > match.remaining) {
        throw new BadRequestException(
          `Refund quantity ${requested.quantity} exceeds remaining quantity ${match.remaining} for this item.`,
        );
      }
      const amount = unitShare(money(match.saleItem.total.toString()), match.saleItem.quantity, requested.quantity);
      return {
        saleItem: match.saleItem,
        quantity: requested.quantity,
        restock: requested.restock,
        amount,
      };
    });
    const refundTotal = roundMoney(refundLines.reduce((sum, line) => sum.add(line.amount), money(0)));
    const allocations = this.allocatePayments(sale, refundTotal, dto, mode);
    const allocatedSum = roundMoney(allocations.reduce((sum, item) => sum.add(item.prepared.amount), money(0)));
    if (!allocatedSum.eq(refundTotal)) {
      throw new BadRequestException('Refund payment amounts must equal the refunded item total.');
    }

    const refund = await tx.refund.create({
      data: {
        tenantId: actor.tenantId,
        saleId: sale.id,
        paymentId: allocations[0]?.paymentId ?? null,
        amount: refundTotal,
        reason: dto.reason.trim(),
        status: RefundStatus.COMPLETED,
        createdById: actor.userId,
      },
    });

    for (const line of refundLines) {
      await tx.refundItem.create({
        data: {
          tenantId: actor.tenantId,
          refundId: refund.id,
          saleItemId: line.saleItem.id,
          productVariantId: line.saleItem.productVariantId,
          quantity: line.quantity,
          amount: line.amount,
          restock: line.restock,
        },
      });
      if (line.restock === RestockDisposition.NONE) {
        continue;
      }
      await this.inventory.applyReturn(tx, {
        tenantId: actor.tenantId,
        productVariantId: line.saleItem.productVariantId,
        quantity: line.quantity,
        referenceType: mode === 'CANCEL' ? 'SALE_CANCELLED' : 'SALE_REFUND',
        referenceId: refund.id,
        reason: dto.reason,
        createdBy: actor.userId,
      });
      if (line.restock === RestockDisposition.DAMAGE) {
        await this.inventory.applyDamageWriteOff(tx, {
          tenantId: actor.tenantId,
          productVariantId: line.saleItem.productVariantId,
          quantity: line.quantity,
          referenceType: 'SALE_REFUND_DAMAGE',
          referenceId: refund.id,
          reason: dto.reason,
          createdBy: actor.userId,
        });
      }
    }

    for (const allocation of allocations) {
      await tx.refundPayment.create({
        data: {
          tenantId: actor.tenantId,
          refundId: refund.id,
          paymentId: allocation.paymentId,
          amount: allocation.prepared.amount,
          method: allocation.prepared.method,
          status: allocation.prepared.status as PaymentStatus,
          reference: allocation.prepared.reference,
          provider: allocation.prepared.provider,
          metadata: allocation.prepared.metadata,
        },
      });
    }

    await this.updateOriginalPayments(tx, sale, allocations);
    if (sale.posSessionId) {
      await this.applySessionRefunds(tx, actor.tenantId, sale.posSessionId, allocations);
    }

    const remainingAfter = this.remainingAfter(sale, refundLines);
    const nextStatus =
      mode === 'CANCEL'
        ? SaleStatus.CANCELLED
        : remainingAfter === 0
          ? SaleStatus.REFUNDED
          : SaleStatus.PARTIALLY_REFUNDED;
    const updated = await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: nextStatus,
        ...(mode === 'CANCEL'
          ? { cancelledAt: new Date(), cancelledById: actor.userId, cancelReason: dto.reason.trim() }
          : {}),
      },
      include: { ...reversalInclude, refunds: { include: { items: true, payments: true } } },
    });

    await this.audit.log(
      {
        action:
          mode === 'CANCEL'
            ? AUDIT_ACTIONS.POS_SALE_CANCELLED
            : remainingAfter === 0
              ? AUDIT_ACTIONS.POS_SALE_REFUNDED
              : AUDIT_ACTIONS.POS_SALE_PARTIALLY_REFUNDED,
        tenantId: actor.tenantId,
        userId: actor.userId,
        entity: 'Sale',
        entityId: sale.id,
        metadata: {
          reason: dto.reason,
          invoiceNumber: sale.invoiceNumber,
          amount: refundTotal.toFixed(2),
          mode,
        },
      },
      tx,
    );

    return toSaleDto(updated);
  }

  private remainingItems(sale: SaleForReversal) {
    const refunded = new Map<string, number>();
    for (const refund of sale.refunds.filter((item) => item.status === RefundStatus.COMPLETED)) {
      for (const item of refund.items) {
        refunded.set(item.saleItemId, (refunded.get(item.saleItemId) ?? 0) + item.quantity);
      }
    }
    return sale.items.map((saleItem) => ({
      saleItem,
      remaining: saleItem.quantity - (refunded.get(saleItem.id) ?? 0),
    }));
  }

  private remainingAfter(
    sale: SaleForReversal,
    refundLines: Array<{ saleItem: { id: string }; quantity: number }>,
  ) {
    const extra = new Map(refundLines.map((line) => [line.saleItem.id, line.quantity]));
    return this.remainingItems(sale).reduce((sum, item) => sum + Math.max(0, item.remaining - (extra.get(item.saleItem.id) ?? 0)), 0);
  }

  private allocatePayments(sale: SaleForReversal, refundTotal: Prisma.Decimal, dto: RefundSaleDto, mode: 'REFUND' | 'CANCEL') {
    const remainingByPayment = this.remainingPaymentBalances(sale);
    const available = remainingByPayment.filter((row) => row.remaining.gt(0));
    if (dto.payments && dto.payments.length > 0) {
      return dto.payments.map((input) => {
        const original = input.paymentId ? available.find((row) => row.payment.id === input.paymentId) : undefined;
        const method = input.method ?? original?.payment.method;
        if (!method) {
          throw new BadRequestException('Refund payment method or original payment id is required.');
        }
        const amount = input.amount ? parseMoney(input.amount, 'amount') : undefined;
        if (!amount) {
          throw new BadRequestException('Each refund payment must include an amount.');
        }
        if (original && amount.gt(original.remaining)) {
          throw new BadRequestException('Refund exceeds the remaining balance on the original payment.');
        }
        const prepared = this.processor.prepareRefund({
          method,
          amount,
          confirmed: input.confirmed ?? dto.confirmed ?? mode === 'CANCEL',
          reference: input.reference,
          provider: input.provider,
          metadata: { confirmationType: mode === 'CANCEL' ? 'CASHIER_CANCELLATION' : 'CASHIER_CONFIRMED', gatewayConfirmed: false },
        });
        return { paymentId: original?.payment.id ?? input.paymentId ?? null, prepared };
      });
    }

    const remainingTotal = roundMoney(available.reduce((sum, row) => sum.add(row.remaining), money(0)));
    if (refundTotal.gt(remainingTotal)) {
      throw new BadRequestException('Refund exceeds the remaining refundable payment balance.');
    }
    const weights = available.map((row) => row.remaining);
    const shares = allocateProportional(weights, refundTotal);
    return available
      .map((row, index) => ({ row, share: shares[index] ?? money(0) }))
      .filter((entry) => entry.share.gt(0))
      .map(({ row, share }) => ({
        paymentId: row.payment.id as string | null,
        prepared: this.processor.prepareRefund({
          method: row.payment.method,
          amount: share,
          confirmed: dto.confirmed ?? mode === 'CANCEL',
          metadata: { confirmationType: mode === 'CANCEL' ? 'CASHIER_CANCELLATION' : 'CASHIER_CONFIRMED', gatewayConfirmed: false },
        }),
      }));
  }

  private remainingPaymentBalances(sale: SaleForReversal) {
    const refunded = new Map<string, Prisma.Decimal>();
    for (const refund of sale.refunds.filter((item) => item.status === RefundStatus.COMPLETED)) {
      for (const payment of refund.payments) {
        if (!payment.paymentId) {
          continue;
        }
        refunded.set(payment.paymentId, (refunded.get(payment.paymentId) ?? money(0)).add(money(payment.amount.toString())));
      }
    }
    const refundable: PaymentStatus[] = [
      PaymentStatus.COMPLETED,
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
    ];
    return sale.payments
      .filter((payment) => refundable.includes(payment.status))
      .map((payment) => ({
        payment,
        remaining: roundMoney(money(payment.amount.toString()).sub(refunded.get(payment.id) ?? money(0))),
      }));
  }

  private async updateOriginalPayments(
    tx: Prisma.TransactionClient,
    sale: SaleForReversal,
    allocations: Array<{ paymentId: string | null; prepared: { amount: Prisma.Decimal } }>,
  ) {
    const affected = new Set(allocations.map((item) => item.paymentId).filter((id): id is string => Boolean(id)));
    for (const paymentId of affected) {
      const original = sale.payments.find((payment) => payment.id === paymentId);
      if (!original) {
        continue;
      }
      const already = sale.refunds
        .filter((item) => item.status === RefundStatus.COMPLETED)
        .flatMap((item) => item.payments)
        .filter((item) => item.paymentId === paymentId)
        .reduce((sum, item) => sum.add(money(item.amount.toString())), money(0));
      const current = allocations
        .filter((item) => item.paymentId === paymentId)
        .reduce((sum, item) => sum.add(item.prepared.amount), money(0));
      const refunded = roundMoney(already.add(current));
      const originalAmount = money(original.amount.toString());
      const status = refunded.gte(originalAmount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      await tx.payment.update({ where: { id: paymentId }, data: { status } });
    }
  }

  private async applySessionRefunds(
    tx: Prisma.TransactionClient,
    tenantId: string,
    sessionId: string,
    allocations: Array<{ prepared: { method: PaymentMethod; amount: Prisma.Decimal } }>,
  ) {
    const session = await this.sessions.lock(tx, tenantId, sessionId);
    const cashRefund = allocations
      .filter((item) => item.prepared.method === PaymentMethod.CASH)
      .reduce((sum, item) => sum.add(item.prepared.amount), money(0));
    if (cashRefund.lte(0)) {
      return;
    }
    const cashRefunds = money(session.cashRefunds.toString()).add(cashRefund);
    await tx.posSession.update({
      where: { id: session.id },
      data: {
        cashRefunds,
        expectedCash: expectedCash(
          money(session.openingCash.toString()),
          money(session.cashSales.toString()),
          cashRefunds,
        ),
      },
    });
  }
}
