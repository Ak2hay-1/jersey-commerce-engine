import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogStatus,
  PaymentMethod,
  Prisma,
  SaleStatus,
  VariantStatus,
} from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import { InventoryService } from '../inventory/inventory.service';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { allocateProportional, parseTaxRate, splitTax } from '../finance/tax';
import { PaymentProcessor } from '../payments/payment-processor.service';
import { PaymentsService } from '../payments/payments.service';
import { ReceiptService } from '../receipts/receipt.service';
import { canViewAllPosData, expectedCash, money, roundMoney } from './pos-money';
import { cartTotals, toSaleDto } from './pos.mapper';
import { InvoiceService } from './invoice.service';
import { PosCartService } from './pos-cart.service';
import { PosRefundService } from './pos-refund.service';
import { PosSessionService } from './pos-session.service';
import type { CancelSaleDto, CompleteSaleDto, PosSaleQueryDto } from './dto/sale.dto';

const saleInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, name: true, email: true } },
  items: true,
  payments: true,
  refunds: { include: { items: true, payments: true } },
} satisfies Prisma.SaleInclude;

@Injectable()
export class PosSaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
    private readonly invoices: InvoiceService,
    private readonly carts: PosCartService,
    private readonly sessions: PosSessionService,
    private readonly processor: PaymentProcessor,
    private readonly payments: PaymentsService,
    private readonly receipts: ReceiptService,
    private readonly refunds: PosRefundService,
  ) {}

  async complete(actor: AuthPrincipal, dto: CompleteSaleDto) {
    const tenantId = actor.tenantId;
    return this.prisma.$transaction(
      async (raw) => {
        const tx = asTx(raw);
        const open = await this.sessions.requireOpenForUser(tenantId, actor.userId, tx);
        const session = await this.sessions.lock(tx, tenantId, open.id);
        const cartId = dto.cartId ?? (await this.activeCartId(tx, tenantId, session.id, actor.userId));
        const cart = await this.carts.lock(tx, tenantId, cartId);
        if (cart.status !== 'ACTIVE') {
          throw new ConflictException('Only an active cart can be completed.');
        }
        if (cart.posSessionId !== session.id) {
          throw new BadRequestException('Cart does not belong to the open POS session.');
        }
        if (!canViewAllPosData(actor) && cart.userId !== actor.userId) {
          throw new ForbiddenException('You cannot complete another cashier’s cart.');
        }
        if (cart.items.length === 0) {
          throw new BadRequestException('Cart has no items.');
        }

        const tenant = await tx.tenant.findFirstOrThrow({ where: { id: tenantId } });
        const pricedItems: Array<{
          line: (typeof cart.items)[number];
          variant: {
            id: string;
            sku: string;
            size: string | null;
            color: string | null;
            product: { name: string };
          };
          unitPrice: Prisma.Decimal;
          quantity: number;
          discountType: (typeof cart.items)[number]['discountType'];
          discountValue: Prisma.Decimal;
          costPrice: Prisma.Decimal;
          taxRate: Prisma.Decimal;
          taxInclusive: boolean;
        }> = [];
        const variantIds = [...new Set(cart.items.map((item) => item.productVariantId))].sort();
        for (const variantId of variantIds) {
          const lines = cart.items.filter((item) => item.productVariantId === variantId);
          const variant = await tx.productVariant.findFirst({
            where: { id: variantId, tenantId },
            include: { product: true },
          });
          if (!variant) {
            throw new NotFoundException('Product variant not found');
          }
          if (variant.product.status !== CatalogStatus.ACTIVE) {
            throw new BadRequestException('Product is not active.');
          }
          if (variant.status !== VariantStatus.ACTIVE) {
            throw new BadRequestException('Product variant is not active.');
          }
          const sellingPrice = money(variant.sellingPrice.toString());
          if (sellingPrice.lte(0)) {
            throw new BadRequestException('Selling price is not valid.');
          }
          const taxRate = parseTaxRate(variant.taxRate ?? tenant.defaultTaxRate);
          const taxInclusive = variant.taxInclusive ?? tenant.taxInclusivePricing;
          for (const line of lines) {
            const snapshot = money(line.unitPrice.toString());
            if (!snapshot.eq(sellingPrice)) {
              await this.audit.log(
                {
                  action: AUDIT_ACTIONS.POS_PRICE_REVALIDATED,
                  tenantId,
                  userId: actor.userId,
                  entity: 'PosCartItem',
                  entityId: line.id,
                  metadata: {
                    previousPrice: snapshot.toFixed(2),
                    currentPrice: sellingPrice.toFixed(2),
                    sku: variant.sku,
                  },
                },
                tx,
              );
            }
            pricedItems.push({
              line,
              variant,
              unitPrice: sellingPrice,
              quantity: line.quantity,
              discountType: line.discountType,
              discountValue: money(line.discountValue.toString()),
              costPrice: money(variant.costPrice.toString()),
              taxRate,
              taxInclusive,
            });
          }
        }

        const totals = cartTotals(
          pricedItems.map((item) => ({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountType: item.discountType,
            discountValue: item.discountValue,
          })),
          cart.discountType,
          money(cart.discountValue.toString()),
        );
        if (totals.total.lt(0)) {
          throw new BadRequestException('Sale total cannot be negative.');
        }
        const cartShares = allocateProportional(totals.lineNets, totals.cartDiscountAmount);
        const snapshots = pricedItems.map((item, index) => {
          const lineNet = totals.lineNets[index] ?? money(0);
          const cartShare = cartShares[index] ?? money(0);
          const payable = roundMoney(lineNet.sub(cartShare));
          const discount = roundMoney((totals.lineDiscountAmounts[index] ?? money(0)).add(cartShare));
          const tax = splitTax(payable, item.taxRate, item.taxInclusive);
          return {
            ...item,
            discount,
            taxAmount: tax.tax,
            lineTotal: tax.total,
          };
        });
        const saleTax = roundMoney(snapshots.reduce((sum, item) => sum.add(item.taxAmount), money(0)));
        const saleTotal = roundMoney(snapshots.reduce((sum, item) => sum.add(item.lineTotal), money(0)));
        const saleDiscount = roundMoney(snapshots.reduce((sum, item) => sum.add(item.discount), money(0)));
        const taxInclusive = snapshots.every((item) => item.taxInclusive);
        if (dto.payments.some((payment) => payment.method === 'UPI' && payment.confirmed)) {
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.PAYMENT_UPI_CONFIRMED,
              tenantId,
              userId: actor.userId,
              entity: 'PosCart',
              entityId: cart.id,
              metadata: { methods: dto.payments.map((payment) => payment.method) },
            },
            tx,
          );
        }

        const payments = this.processor.prepareCaptures(
          saleTotal,
          dto.payments.map((payment) => ({
            method: payment.method,
            amount: payment.amount,
            amountReceived: payment.amountReceived,
            reference: payment.reference,
            provider: payment.provider,
            confirmed: payment.confirmed,
            metadata: payment.metadata,
          })),
        );

        const invoiceNumber = await this.invoices.nextSaleInvoice(tx, tenantId);
        const sale = await tx.sale.create({
          data: {
            tenantId,
            invoiceNumber,
            customerId: cart.customerId,
            cashierId: actor.userId,
            posSessionId: session.id,
            posCartId: cart.id,
            subtotal: totals.subtotal,
            discount: saleDiscount,
            discountType: cart.discountType,
            discountValue: money(cart.discountValue.toString()),
            tax: saleTax,
            taxInclusive,
            total: saleTotal,
            status: SaleStatus.COMPLETED,
            notes: dto.notes?.trim() || cart.notes,
          },
        });

        for (const item of snapshots) {
          await tx.saleItem.create({
            data: {
              tenantId,
              saleId: sale.id,
              productVariantId: item.variant.id,
              productName: item.variant.product.name,
              sku: item.variant.sku,
              size: item.variant.size,
              color: item.variant.color,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              discountType: item.discountType,
              discountValue: item.discountValue,
              discount: item.discount,
              taxRate: item.taxRate,
              taxInclusive: item.taxInclusive,
              tax: item.taxAmount,
              total: item.lineTotal,
            },
          });
        }

        await this.payments.persist(tx, {
          tenantId,
          saleId: sale.id,
          orderId: null,
          posSessionId: session.id,
          createdById: actor.userId,
          payments,
        });

        for (const variantId of variantIds) {
          const quantity = cart.items
            .filter((item) => item.productVariantId === variantId)
            .reduce((sum, item) => sum + item.quantity, 0);
          await this.inventory.applySale(tx, {
            tenantId,
            productVariantId: variantId,
            quantity,
            referenceType: 'SALE',
            referenceId: sale.id,
            reason: invoiceNumber,
            createdBy: actor.userId,
          });
        }

        const sessionTotals = this.applyPaymentTotals(session, payments, 'SALE');
        await tx.posSession.update({
          where: { id: session.id },
          data: sessionTotals,
        });
        await tx.posCart.update({
          where: { id: cart.id },
          data: { status: 'COMPLETED' },
        });
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.POS_SALE_COMPLETED,
            tenantId,
            userId: actor.userId,
            entity: 'Sale',
            entityId: sale.id,
            metadata: {
              invoiceNumber,
              total: saleTotal.toFixed(2),
              discount: saleDiscount.toFixed(2),
              tax: saleTax.toFixed(2),
              methods: payments.map((payment) => payment.method),
              customerId: cart.customerId,
              posSessionId: session.id,
            },
          },
          tx,
        );
        try {
          await this.receipts.issue(tx, tenantId, sale.id);
        } catch {
          // Structured receipt can be rebuilt later. Printing is never part of this transaction.
        }

        const complete = await tx.sale.findFirstOrThrow({
          where: { id: sale.id, tenantId },
          include: saleInclude,
        });
        return toSaleDto(complete);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 20000,
        maxWait: 5000,
      },
    );
  }

  async findAll(actor: AuthPrincipal, query: PosSaleQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = this.saleWhere(actor, query);
    const orderBy = this.saleOrder(query);
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        include: saleInclude,
        orderBy,
        skip,
        take,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { items: items.map(toSaleDto), meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(actor: AuthPrincipal, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: saleInclude,
    });
    if (!sale || (!canViewAllPosData(actor) && sale.cashierId !== actor.userId)) {
      throw new NotFoundException('Sale not found');
    }
    return toSaleDto(sale);
  }

  async cancel(actor: AuthPrincipal, id: string, dto: CancelSaleDto) {
    if (!actor.permissions.includes('sales.cancel')) {
      await this.audit.log({
        action: AUDIT_ACTIONS.POS_SALE_CANCEL_ATTEMPTED,
        tenantId: actor.tenantId,
        userId: actor.userId,
        entity: 'Sale',
        entityId: id,
        metadata: { reason: dto.reason },
      });
      throw new ForbiddenException('You do not have permission to cancel sales.');
    }
    return this.prisma.$transaction(async (raw) => {
      const tx = asTx(raw);
      const sale = await this.refunds.lockSale(tx, actor.tenantId, id);
      if (sale.status !== SaleStatus.COMPLETED) {
        throw new ConflictException('Only a completed sale can be cancelled.');
      }
      if (sale.refunds.some((refund) => refund.status === 'COMPLETED')) {
        throw new ConflictException('A sale that already has refunds must be refunded rather than cancelled.');
      }
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.PAYMENT_CANCELLED,
          tenantId: actor.tenantId,
          userId: actor.userId,
          entity: 'Sale',
          entityId: sale.id,
          metadata: { invoiceNumber: sale.invoiceNumber, reason: dto.reason },
        },
        tx,
      );
      return this.refunds.reverseForCancel(tx, actor, sale, dto.reason);
    });
  }

  async receipt(actor: AuthPrincipal, id: string, format: 'json' | 'html' | 'thermal' | 'pdf' | 'email' = 'json') {
    return this.receipts.get(actor, id, format);
  }

  private saleWhere(actor: AuthPrincipal, query: PosSaleQueryDto): Prisma.SaleWhereInput {
    const createdAt = this.dateRange(query.from, query.to);
    const cashierId = canViewAllPosData(actor) ? query.cashierId : actor.userId;
    const total =
      query.minAmount || query.maxAmount
        ? {
            ...(query.minAmount ? { gte: money(query.minAmount) } : {}),
            ...(query.maxAmount ? { lte: money(query.maxAmount) } : {}),
          }
        : undefined;
    return {
      tenantId: actor.tenantId,
      ...(cashierId ? { cashierId } : {}),
      ...(query.sessionId ? { posSessionId: query.sessionId } : {}),
      ...(query.invoiceNumber ? { invoiceNumber: { equals: query.invoiceNumber, mode: 'insensitive' } } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(query.paymentMethod ? { payments: { some: { method: query.paymentMethod } } } : {}),
      ...(total ? { total } : {}),
    };
  }

  private saleOrder(query: PosSaleQueryDto): Prisma.SaleOrderByWithRelationInput {
    switch (query.sort) {
      case 'total_asc':
        return { total: 'asc' };
      case 'total_desc':
        return { total: 'desc' };
      case 'invoice_asc':
        return { invoiceNumber: 'asc' };
      case 'created_asc':
        return { createdAt: 'asc' };
      default:
        return { createdAt: 'desc' };
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

  private async activeCartId(tx: Prisma.TransactionClient, tenantId: string, sessionId: string, userId: string) {
    const cart = await tx.posCart.findFirst({
      where: { tenantId, posSessionId: sessionId, userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!cart) {
      throw new BadRequestException('No active cart');
    }
    return cart.id;
  }

  private applyPaymentTotals(
    session: {
      openingCash: Prisma.Decimal;
      cashSales: Prisma.Decimal;
      cashRefunds: Prisma.Decimal;
      cardSales: Prisma.Decimal;
      upiSales: Prisma.Decimal;
      otherSales: Prisma.Decimal;
    },
    payments: Array<{ method: PaymentMethod | string; amount: Prisma.Decimal }>,
    direction: 'SALE' | 'REFUND',
  ) {
    let cashSales = money(session.cashSales.toString());
    let cardSales = money(session.cardSales.toString());
    let upiSales = money(session.upiSales.toString());
    let otherSales = money(session.otherSales.toString());
    const sign = direction === 'SALE' ? 1 : -1;
    for (const payment of payments) {
      const amount = payment.amount.mul(sign);
      if (payment.method === PaymentMethod.CASH) {
        cashSales = cashSales.add(amount);
      } else if (payment.method === PaymentMethod.CARD) {
        cardSales = cardSales.add(amount);
      } else if (payment.method === PaymentMethod.UPI) {
        upiSales = upiSales.add(amount);
      } else {
        otherSales = otherSales.add(amount);
      }
    }
    return {
      cashSales,
      cardSales,
      upiSales,
      otherSales,
      expectedCash: expectedCash(money(session.openingCash.toString()), cashSales, money(session.cashRefunds.toString())),
    };
  }
}
