import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { parseMoney } from '../catalog/money';
import { phoneSearchDigits } from '../customers/customer-phone';
import type { AuthPrincipal } from '../common/context/request-context';
import type { RequestMeta } from '../auth/auth-session.service';
import { assertFound } from '../common/http/assert-found';
import { OrderEngineService } from './order-engine.service';
import { orderInclude, toOrderDetail, toOrderSummary, type OrderRecord } from './order.mapper';
import type { AdminOrderQueryDto, CancelOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: OrderEngineService,
  ) {}

  async findAll(tenantId: string, query: AdminOrderQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = this.adminWhere(tenantId, query);
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: records.map((record) => toOrderSummary(record as OrderRecord)),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async findById(tenantId: string, id: string) {
    const record = await this.prisma.order.findFirst({
      where: { tenantId, OR: [{ id }, { orderNumber: id }] },
      include: orderInclude,
    });
    return toOrderDetail(assertFound(record, 'Order not found') as OrderRecord);
  }

  async findForCustomer(tenantId: string, customerId: string, query: AdminOrderQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where: Prisma.OrderWhereInput = { tenantId, customerId };
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: records.map((record) => toOrderSummary(record as OrderRecord)),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async findCustomerOrder(tenantId: string, customerId: string, id: string) {
    const record = await this.prisma.order.findFirst({
      where: { tenantId, customerId, OR: [{ id }, { orderNumber: id }] },
      include: orderInclude,
    });
    return toOrderDetail(assertFound(record, 'Order not found') as OrderRecord);
  }

  async updateStatus(actor: AuthPrincipal, id: string, dto: UpdateOrderStatusDto, meta?: RequestMeta) {
    const order = await this.requireOrder(actor.tenantId, id);
    const updated = await this.engine.transitionStatus({
      tenantId: actor.tenantId,
      orderId: order.id,
      status: dto.status,
      actor,
      meta,
    });
    return toOrderDetail(updated);
  }

  async cancel(actor: AuthPrincipal, id: string, dto: CancelOrderDto, meta?: RequestMeta) {
    const order = await this.requireOrder(actor.tenantId, id);
    const updated = await this.engine.cancelOrder({
      tenantId: actor.tenantId,
      orderId: order.id,
      reason: dto.reason,
      actor,
      meta,
      allowPaid: true,
    });
    return toOrderDetail(updated);
  }

  async cancelForCustomer(tenantId: string, customerId: string, id: string, dto: CancelOrderDto, meta?: RequestMeta) {
    const order = await this.prisma.order.findFirst({
      where: { tenantId, customerId, OR: [{ id }, { orderNumber: id }] },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const updated = await this.engine.cancelOrder({
      tenantId,
      orderId: order.id,
      reason: dto.reason,
      meta,
      allowPaid: false,
    });
    return toOrderDetail(updated);
  }

  private async requireOrder(tenantId: string, id: string) {
    const record = await this.prisma.order.findFirst({
      where: { tenantId, OR: [{ id }, { orderNumber: id }] },
      select: { id: true },
    });
    return assertFound(record, 'Order not found');
  }

  private adminWhere(tenantId: string, query: AdminOrderQueryDto): Prisma.OrderWhereInput {
    const AND: Prisma.OrderWhereInput[] = [{ tenantId }];
    if (query.orderNumber?.trim()) {
      AND.push({ orderNumber: { contains: query.orderNumber.trim(), mode: 'insensitive' } });
    }
    if (query.customerId?.trim()) {
      AND.push({ customerId: query.customerId.trim() });
    }
    if (query.customer?.trim()) {
      AND.push({
        customer: {
          is: {
            OR: [
              { name: { contains: query.customer.trim(), mode: 'insensitive' } },
              { email: { contains: query.customer.trim(), mode: 'insensitive' } },
            ],
          },
        },
      });
    }
    if (query.phone?.trim()) {
      const digits = phoneSearchDigits(query.phone);
      AND.push({
        OR: [
          { customer: { is: { phone: { contains: digits || query.phone.trim() } } } },
          { shippingAddress: { is: { phone: { contains: query.phone.trim() } } } },
        ],
      });
    }
    if (query.status) {
      AND.push({ status: query.status });
    }
    if (query.paymentStatus) {
      AND.push({ paymentStatus: query.paymentStatus });
    }
    if (query.source) {
      AND.push({ source: query.source });
    }
    const createdAt = this.dateRange(query.from, query.to);
    if (createdAt) {
      AND.push({ createdAt });
    }
    if (query.minTotal || query.maxTotal) {
      AND.push({
        total: {
          ...(query.minTotal ? { gte: parseMoney(query.minTotal, 'minTotal') } : {}),
          ...(query.maxTotal ? { lte: parseMoney(query.maxTotal, 'maxTotal') } : {}),
        },
      });
    }
    return { AND };
  }

  private dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return undefined;
    }
    const range: Prisma.DateTimeFilter = {};
    if (from) {
      const parsed = new Date(from);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('from must be a valid date.');
      }
      range.gte = parsed;
    }
    if (to) {
      const parsed = new Date(to);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('to must be a valid date.');
      }
      range.lte = parsed;
    }
    return range;
  }
}
