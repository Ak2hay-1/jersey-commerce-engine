import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { OrderEngineService } from './order-engine.service';
import { RazorpayOnlineGateway } from './razorpay-online.gateway';

const LOCK_KEY = 'jobs:order-expiry';
const LOCK_TTL_SECONDS = 240;
const BATCH_SIZE = 50;

export function orderPaymentTtlMinutes(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.ORDER_PAYMENT_TTL_MINUTES);
  return Number.isFinite(parsed) && parsed >= 15 ? Math.floor(parsed) : 60;
}

/**
 * Releases stock held by storefront orders whose online payment never arrived. Each candidate is first
 * reconciled with Razorpay so a capture the webhook missed confirms the order instead of cancelling it.
 */
@Injectable()
export class OrderExpiryService {
  private readonly logger = new Logger(OrderExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly engine: OrderEngineService,
    private readonly gateway: RazorpayOnlineGateway,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async tick(): Promise<void> {
    if (process.env.ORDER_EXPIRY_ENABLED === 'false') {
      return;
    }
    let locked: string | null = null;
    try {
      locked = await this.redis.getClient().set(LOCK_KEY, String(process.pid), 'EX', LOCK_TTL_SECONDS, 'NX');
    } catch {
      return;
    }
    if (!locked) {
      return;
    }
    try {
      await this.expireUnpaidOrders();
    } catch (error) {
      this.logger.error(`Order expiry run failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await this.redis.getClient().del(LOCK_KEY).catch(() => undefined);
    }
  }

  async expireUnpaidOrders(now = new Date()): Promise<{ expired: number; confirmed: number; skipped: number }> {
    const cutoff = new Date(now.getTime() - orderPaymentTtlMinutes() * 60_000);
    const candidates = await this.prisma.order.findMany({
      where: {
        source: 'WEBSITE',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: { lt: cutoff },
        payments: { some: { method: 'ONLINE', status: 'PENDING' }, none: { method: 'COD' } },
      },
      select: {
        id: true,
        tenantId: true,
        orderNumber: true,
        payments: { where: { method: 'ONLINE', status: 'PENDING' }, select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    let expired = 0;
    let confirmed = 0;
    let skipped = 0;
    for (const order of candidates) {
      try {
        let state: 'captured' | 'unpaid' | 'unknown' = 'unpaid';
        for (const payment of order.payments) {
          const result = await this.gateway.reconcilePendingPayment(order.tenantId, payment.id);
          if (result === 'captured') {
            state = 'captured';
            break;
          }
          if (result === 'unknown') {
            state = 'unknown';
          }
        }
        if (state === 'captured') {
          confirmed += 1;
          continue;
        }
        if (state === 'unknown') {
          skipped += 1;
          continue;
        }
        await this.engine.cancelOrder({
          tenantId: order.tenantId,
          orderId: order.id,
          reason: `Payment not received within ${orderPaymentTtlMinutes()} minutes`,
        });
        await this.audit
          .log({
            action: AUDIT_ACTIONS.ORDER_EXPIRED,
            tenantId: order.tenantId,
            entity: 'Order',
            entityId: order.id,
            metadata: { orderNumber: order.orderNumber, ttlMinutes: orderPaymentTtlMinutes() },
          })
          .catch(() => undefined);
        expired += 1;
      } catch (error) {
        skipped += 1;
        this.logger.warn(
          `Could not expire order ${order.orderNumber}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (expired || confirmed) {
      this.logger.log(`Order expiry: expired=${expired} confirmed=${confirmed} skipped=${skipped}`);
    }
    return { expired, confirmed, skipped };
  }
}
