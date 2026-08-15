import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma, SaleStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { parseMoney } from '../catalog/money';
import { canViewAllPosData, money, moneyString, roundMoney } from '../pos/pos-money';
import { PaymentProcessor } from './payment-processor.service';
import type { PreparedPayment } from './payment.types';
import type { CreatePaymentDto, PaymentQueryDto } from './dto/payment.dto';

const paymentInclude = {
  sale: { select: { id: true, invoiceNumber: true, cashierId: true, posSessionId: true, status: true, total: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PaymentInclude;

export type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly processor: PaymentProcessor,
  ) {}

  async findAll(actor: AuthPrincipal, query: PaymentQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = this.paymentWhere(actor, query);
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items: items.map((item) => this.toDto(item)), meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(actor: AuthPrincipal, id: string) {
    const record = await this.prisma.payment.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: paymentInclude,
    });
    if (!record || (!canViewAllPosData(actor) && record.createdById !== actor.userId && record.sale?.cashierId !== actor.userId)) {
      throw new NotFoundException('Payment not found');
    }
    return this.toDto(record);
  }

  async create(actor: AuthPrincipal, dto: CreatePaymentDto) {
    if (!dto.saleId && !dto.orderId) {
      throw new BadRequestException('A payment must reference a sale or an order.');
    }
    if (dto.orderId && !dto.saleId) {
      throw new BadRequestException('Order payments are not captured in this phase.');
    }
    try {
      return await this.createInTransaction(actor, dto);
    } catch (error) {
      await this.audit.log({
        action: AUDIT_ACTIONS.PAYMENT_FAILED,
        tenantId: actor.tenantId,
        userId: actor.userId,
        entity: dto.saleId ? 'Sale' : 'Payment',
        entityId: dto.saleId ?? dto.orderId ?? 'unknown',
        metadata: { method: dto.method, reason: error instanceof Error ? error.message : 'payment_failed' },
      });
      throw error;
    }
  }

  private async createInTransaction(actor: AuthPrincipal, dto: CreatePaymentDto) {
    if (!dto.saleId && !dto.orderId) {
      throw new BadRequestException('A payment must reference a sale or an order.');
    }
    if (dto.orderId && !dto.saleId) {
      throw new BadRequestException('Order payments are not captured in this phase.');
    }
    const tenantId = actor.tenantId;
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: dto.saleId, tenantId },
        include: { payments: true, posSession: true },
      });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }
      if (!canViewAllPosData(actor) && sale.cashierId !== actor.userId) {
        throw new ForbiddenException('You cannot record a payment for another cashier’s sale.');
      }
      if (sale.status !== SaleStatus.COMPLETED && sale.status !== SaleStatus.PARTIALLY_REFUNDED) {
        throw new ConflictException('Payments can only be recorded against an open completed sale.');
      }
      const paid = roundMoney(
        sale.payments
          .filter((payment) => payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.PARTIALLY_REFUNDED)
          .reduce((sum, payment) => sum.add(money(payment.amount.toString())), money(0)),
      );
      const remaining = roundMoney(money(sale.total.toString()).sub(paid));
      if (remaining.lte(0)) {
        throw new BadRequestException('Sale is already paid in full.');
      }
      const billed = dto.amount ? parseMoney(dto.amount, 'amount') : remaining;
      if (billed.gt(remaining)) {
        throw new BadRequestException('Payment exceeds the remaining balance.');
      }
      const prepared = this.processor.prepareCaptures(billed, [
        {
          method: dto.method,
          amount: billed,
          amountReceived: dto.amountReceived,
          reference: dto.reference,
          provider: dto.provider,
          confirmed: dto.confirmed,
          metadata: dto.metadata,
        },
      ]);
      const created = await this.persist(tx, {
        tenantId,
        saleId: sale.id,
        orderId: null,
        posSessionId: sale.posSessionId,
        createdById: actor.userId,
        payments: prepared,
      });
      const first = created[0];
      const preparedPayment = prepared[0];
      if (!first || !preparedPayment) {
        throw new ConflictException('Payment was not persisted.');
      }
      const action =
        dto.method === 'UPI' ? AUDIT_ACTIONS.PAYMENT_UPI_CONFIRMED : AUDIT_ACTIONS.PAYMENT_CREATED;
      await this.audit.log(
        {
          action,
          tenantId,
          userId: actor.userId,
          entity: 'Payment',
          entityId: first.id,
          metadata: {
            method: dto.method,
            amount: billed.toFixed(2),
            saleId: sale.id,
            invoiceNumber: sale.invoiceNumber,
            reference: preparedPayment.reference,
          },
        },
        tx,
      );
      return this.toDto(
        await tx.payment.findFirstOrThrow({ where: { id: first.id, tenantId }, include: paymentInclude }),
      );
    });
  }

  async persist(
    tx: object,
    input: {
      tenantId: string;
      saleId: string | null;
      orderId: string | null;
      posSessionId: string | null;
      createdById: string | null;
      payments: PreparedPayment[];
    },
  ) {
    const client = asTx(tx);
    const created: Array<{ id: string }> = [];
    for (const payment of input.payments) {
      await this.assertUniqueReference(client, input.tenantId, payment.method, payment.reference);
      const row = await client.payment.create({
        data: {
          tenantId: input.tenantId,
          saleId: input.saleId,
          orderId: input.orderId,
          posSessionId: input.posSessionId,
          createdById: input.createdById,
          amount: payment.amount,
          method: payment.method,
          status: payment.status as PaymentStatus,
          amountReceived: payment.amountReceived,
          changeDue: payment.changeDue,
          reference: payment.reference,
          provider: payment.provider,
          metadata: payment.metadata,
        },
        select: { id: true },
      });
      created.push(row);
    }
    return created;
  }

  async assertUniqueReference(
    tx: object,
    tenantId: string,
    method: PreparedPayment['method'],
    reference: string | null,
  ) {
    if (!reference) {
      return;
    }
    const existing = await asTx(tx).payment.findFirst({
      where: {
        tenantId,
        method,
        reference: { equals: reference, mode: 'insensitive' },
        status: { in: [PaymentStatus.PENDING, PaymentStatus.COMPLETED, PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A payment with this reference already exists.');
    }
  }

  toDto(payment: {
    id: string;
    tenantId: string;
    saleId: string | null;
    orderId: string | null;
    posSessionId: string | null;
    amount: Prisma.Decimal;
    method: string;
    status: string;
    amountReceived: Prisma.Decimal | null;
    changeDue: Prisma.Decimal | null;
    reference: string | null;
    provider: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    sale?: { id: string; invoiceNumber: string } | null;
    createdBy?: { id: string; name: string; email: string } | null;
  }) {
    return {
      id: payment.id,
      tenantId: payment.tenantId,
      saleId: payment.saleId,
      orderId: payment.orderId,
      posSessionId: payment.posSessionId,
      amount: moneyString(payment.amount),
      method: payment.method,
      status: payment.status,
      amountReceived: payment.amountReceived ? moneyString(payment.amountReceived) : null,
      changeDue: payment.changeDue ? moneyString(payment.changeDue) : null,
      reference: payment.reference,
      provider: payment.provider,
      metadata: payment.metadata,
      invoiceNumber: payment.sale?.invoiceNumber ?? null,
      createdBy: payment.createdBy ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private paymentWhere(actor: AuthPrincipal, query: PaymentQueryDto): Prisma.PaymentWhereInput {
    const createdAt = this.dateRange(query.from, query.to);
    const cashierId = canViewAllPosData(actor) ? query.cashierId : actor.userId;
    return {
      tenantId: actor.tenantId,
      ...(cashierId
        ? {
            OR: [{ createdById: cashierId }, { sale: { is: { cashierId } } }],
          }
        : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.sessionId ? { posSessionId: query.sessionId } : {}),
      ...(query.invoiceNumber
        ? { sale: { is: { invoiceNumber: { equals: query.invoiceNumber, mode: 'insensitive' } } } }
        : {}),
      ...(query.reference ? { reference: { equals: query.reference, mode: 'insensitive' } } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
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
