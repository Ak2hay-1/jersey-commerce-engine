import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import Razorpay from 'razorpay';
import { PaymentMethod, PaymentStatus, Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { PaymentsService } from '../payments/payments.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { formatPaymentConfirmedTelegram } from '../notification-settings/telegram-messages';
import { moneyString } from '../catalog/money';
import { safeEqual } from '../common/crypto/safe-equal';
import type {
  CreatePaymentIntentInput,
  PaymentGateway,
  PaymentIntentResult,
  RefundPaymentInput,
  VerifyPaymentInput,
} from './payment-gateway';

const PROVIDER_KEY = 'razorpay';
const MIN_AMOUNT_PAISE = 100;

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string | null;
};

type PaymentMeta = {
  currency?: string;
  amountPaise?: number;
  razorpayKeyId?: string;
  razorpayOrderId?: string;
};

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string | null;
        amount?: number;
        amount_refunded?: number;
        status?: string;
        error_reason?: string | null;
        error_description?: string | null;
      };
    };
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number } };
  };
};

export type RazorpayWebhookResult = {
  ok: true;
  handled: boolean;
  captured?: { tenantId: string; orderId: string; fulfillmentMethod: string | null };
};

function toPaise(amount: Prisma.Decimal): number {
  return Math.round(Number(amount.toFixed(2)) * 100);
}

function readMeta(value: Prisma.JsonValue | null): PaymentMeta & Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as PaymentMeta & Record<string, unknown>;
  }
  return {};
}

@Injectable()
export class RazorpayOnlineGateway implements PaymentGateway {
  readonly providerKey = PROVIDER_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationSettingsService,
  ) {}

  async createPaymentIntent(input: CreatePaymentIntentInput, tx: object): Promise<PaymentIntentResult> {
    const isWebsite = input.metadata?.source === 'WEBSITE';
    const credentials = await this.paymentSettings.resolveCredentials(input.tenantId);

    if (!isWebsite) {
      return this.createLocalPendingIntent(input, tx);
    }
    if (!credentials) {
      throw new BadRequestException(
        'Online payment is not configured. Add Razorpay keys in Admin → Settings → Payments, or set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      );
    }

    const amountPaise = toPaise(input.amount);
    if (amountPaise < MIN_AMOUNT_PAISE) {
      throw new BadRequestException(`Payment amount must be at least ${MIN_AMOUNT_PAISE} paise.`);
    }

    const currency = (input.currency || 'INR').toUpperCase();
    const receipt =
      typeof input.metadata?.orderNumber === 'string'
        ? String(input.metadata.orderNumber).slice(0, 40)
        : `ord_${input.orderId.slice(0, 20)}`;

    let razorpayOrder: RazorpayOrderResponse;
    try {
      razorpayOrder = await this.createRazorpayOrder(credentials, {
        amount: amountPaise,
        currency,
        receipt,
      });
    } catch (error) {
      this.rethrowRazorpayError(error);
    }

    const created = await this.payments.persist(tx, {
      tenantId: input.tenantId,
      saleId: null,
      orderId: input.orderId,
      posSessionId: null,
      createdById: input.createdById ?? null,
      payments: [
        {
          amount: input.amount,
          method: PaymentMethod.ONLINE,
          status: PaymentStatus.PENDING,
          amountReceived: null,
          changeDue: null,
          reference: razorpayOrder.id,
          provider: this.providerKey,
          metadata: {
            currency,
            gateway: this.providerKey,
            razorpayOrderId: razorpayOrder.id,
            razorpayKeyId: credentials.keyId,
            amountPaise,
            ...(input.metadata ?? {}),
          } as Prisma.InputJsonValue,
        },
      ],
    });
    const paymentId = created[0]?.id;
    if (!paymentId) {
      throw new BadRequestException('Payment intent could not be created.');
    }

    return {
      paymentId,
      status: PaymentStatus.PENDING,
      amount: input.amount,
      currency,
      method: PaymentMethod.ONLINE,
      provider: this.providerKey,
      nextAction: 'AWAIT_GATEWAY',
      checkout: {
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: credentials.keyId,
        amountPaise,
      },
    };
  }

  /** Staff / non-storefront orders keep a local PENDING intent without calling Razorpay. */
  private async createLocalPendingIntent(
    input: CreatePaymentIntentInput,
    tx: object,
  ): Promise<PaymentIntentResult> {
    const created = await this.payments.persist(tx, {
      tenantId: input.tenantId,
      saleId: null,
      orderId: input.orderId,
      posSessionId: null,
      createdById: input.createdById ?? null,
      payments: [
        {
          amount: input.amount,
          method: PaymentMethod.ONLINE,
          status: PaymentStatus.PENDING,
          amountReceived: null,
          changeDue: null,
          reference: null,
          provider: this.providerKey,
          metadata: {
            currency: input.currency,
            gateway: this.providerKey,
            deferred: true,
            ...(input.metadata ?? {}),
          } as Prisma.InputJsonValue,
        },
      ],
    });
    const paymentId = created[0]?.id;
    if (!paymentId) {
      throw new BadRequestException('Payment intent could not be created.');
    }
    return {
      paymentId,
      status: PaymentStatus.PENDING,
      amount: input.amount,
      currency: input.currency,
      method: PaymentMethod.ONLINE,
      provider: this.providerKey,
      nextAction: 'AWAIT_GATEWAY',
    };
  }

  async verifyCheckoutPayment(
    tenantId: string,
    input: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ): Promise<{
    success: true;
    paymentId: string;
    orderId: string | null;
    orderNumber: string | null;
    fulfillmentMethod: string | null;
  }> {
    const prior = await this.prisma.payment.findFirst({
      where: {
        tenantId,
        provider: this.providerKey,
        OR: [{ reference: input.razorpay_order_id }, { reference: input.razorpay_payment_id }],
      },
      select: { status: true },
    });
    const alreadyCompleted = prior?.status === PaymentStatus.COMPLETED;

    const result = await this.prisma.$transaction(async (tx) => {
      const verified = await this.verifyPayment(
        {
          tenantId,
          paymentId: '',
          providerReference: input.razorpay_order_id,
          payload: input,
        },
        tx,
      );
      const payment = await asTx(tx).payment.findFirst({
        where: { id: verified.paymentId, tenantId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              currency: true,
              fulfillmentMethod: true,
              customer: { select: { name: true } },
            },
          },
        },
      });
      return {
        success: true as const,
        paymentId: verified.paymentId,
        orderId: payment?.order?.id ?? null,
        orderNumber: payment?.order?.orderNumber ?? null,
        fulfillmentMethod: payment?.order?.fulfillmentMethod ?? null,
        amount: payment ? moneyString(payment.amount) : undefined,
        currency: payment?.order?.currency ?? 'INR',
        customerName: payment?.order?.customer?.name ?? null,
      };
    });

    if (!alreadyCompleted) {
      this.notifications.schedule(
        tenantId,
        'PAYMENT_CONFIRMED',
        formatPaymentConfirmedTelegram({
          orderNumber: result.orderNumber,
          paymentId: result.paymentId,
          amount: result.amount,
          currency: result.currency,
          customerName: result.customerName,
        }),
      );
    }

    return {
      success: true,
      paymentId: result.paymentId,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      fulfillmentMethod: result.fulfillmentMethod,
    };
  }

  async verifyPayment(input: VerifyPaymentInput, tx?: object): Promise<PaymentIntentResult> {
    const credentials = await this.paymentSettings.resolveCredentials(input.tenantId);
    if (!credentials) {
      throw new UnauthorizedException('Razorpay credentials are not configured.');
    }

    const razorpayOrderId = String(input.payload?.razorpay_order_id ?? input.providerReference ?? '');
    const razorpayPaymentId = String(input.payload?.razorpay_payment_id ?? '');
    const razorpaySignature = String(input.payload?.razorpay_signature ?? '');

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestException('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.');
    }

    const expected = createHmac('sha256', credentials.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!safeEqual(expected, razorpaySignature)) {
      await this.audit
        .log({
          action: AUDIT_ACTIONS.PAYMENT_SIGNATURE_INVALID,
          tenantId: input.tenantId,
          entity: 'payment',
          entityId: input.paymentId ?? razorpayOrderId,
          metadata: { provider: PROVIDER_KEY, razorpayOrderId, razorpayPaymentId },
        })
        .catch(() => undefined);
      throw new BadRequestException('Payment signature verification failed.');
    }

    const run = async (db: ReturnType<typeof asTx>) => {
      let payment = await db.payment.findFirst({
        where: {
          tenantId: input.tenantId,
          provider: this.providerKey,
          reference: razorpayOrderId,
        },
      });
      if (!payment && input.paymentId) {
        payment = await db.payment.findFirst({
          where: { id: input.paymentId, tenantId: input.tenantId },
        });
      }
      if (!payment) {
        const candidates = await db.payment.findMany({
          where: {
            tenantId: input.tenantId,
            provider: this.providerKey,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.COMPLETED] },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        payment =
          candidates.find((row) => readMeta(row.metadata).razorpayOrderId === razorpayOrderId) ?? null;
      }

      if (!payment) {
        throw new BadRequestException('No pending payment found for this Razorpay order.');
      }
      if (payment.status === PaymentStatus.COMPLETED) {
        const metadata = readMeta(payment.metadata);
        return {
          paymentId: payment.id,
          status: PaymentStatus.COMPLETED,
          amount: payment.amount,
          currency: metadata.currency ?? 'INR',
          method: PaymentMethod.ONLINE,
          provider: this.providerKey,
          nextAction: 'NONE' as const,
          checkout: {
            razorpayOrderId,
            razorpayKeyId: metadata.razorpayKeyId ?? credentials.keyId,
            amountPaise: metadata.amountPaise ?? toPaise(payment.amount),
          },
        };
      }
      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('This payment can no longer be completed.');
      }

      await this.assertGatewayCapture(input.tenantId, credentials, payment, razorpayOrderId, razorpayPaymentId);
      await this.completePendingPayment(db, input.tenantId, payment, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        source: 'checkout',
      });

      const prevMeta = readMeta(payment.metadata);
      return {
        paymentId: payment.id,
        status: PaymentStatus.COMPLETED,
        amount: payment.amount,
        currency: typeof prevMeta.currency === 'string' ? prevMeta.currency : 'INR',
        method: PaymentMethod.ONLINE,
        provider: this.providerKey,
        nextAction: 'NONE' as const,
        checkout: {
          razorpayOrderId,
          razorpayKeyId: typeof prevMeta.razorpayKeyId === 'string' ? prevMeta.razorpayKeyId : credentials.keyId,
          amountPaise: typeof prevMeta.amountPaise === 'number' ? prevMeta.amountPaise : toPaise(payment.amount),
        },
      };
    };

    if (tx) {
      return run(asTx(tx));
    }
    return this.prisma.$transaction((inner) => run(asTx(inner)));
  }

  /**
   * Flips a PENDING payment to COMPLETED exactly once. Concurrent verify calls and webhooks race on the
   * conditional update; only the winner updates the order and writes audit entries.
   */
  private async completePendingPayment(
    db: ReturnType<typeof asTx>,
    tenantId: string,
    payment: { id: string; amount: Prisma.Decimal; orderId: string | null; metadata: Prisma.JsonValue | null },
    refs: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature?: string; source: 'checkout' | 'webhook' },
  ): Promise<boolean> {
    const prevMeta = readMeta(payment.metadata);
    const claimed = await db.payment.updateMany({
      where: { id: payment.id, tenantId, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.COMPLETED,
        reference: refs.razorpayPaymentId,
        amountReceived: payment.amount,
        metadata: {
          ...prevMeta,
          razorpayOrderId: refs.razorpayOrderId,
          razorpayPaymentId: refs.razorpayPaymentId,
          ...(refs.razorpaySignature ? { razorpaySignature: refs.razorpaySignature } : {}),
          verifiedAt: new Date().toISOString(),
          verifiedVia: refs.source,
        } as Prisma.InputJsonValue,
      },
    });
    if (claimed.count === 0) {
      return false;
    }

    if (payment.orderId) {
      const order = await db.order.findFirst({ where: { id: payment.orderId, tenantId } });
      if (order && order.paymentStatus !== 'COMPLETED') {
        const nextStatus = order.status === 'PENDING' ? 'CONFIRMED' : order.status;
        await db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'COMPLETED',
            status: nextStatus,
            confirmedAt: order.confirmedAt ?? new Date(),
          },
        });
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.ORDER_PAYMENT_STATE_CHANGED,
            tenantId,
            entity: 'Order',
            entityId: order.id,
            oldValue: { paymentStatus: order.paymentStatus, status: order.status },
            newValue: { paymentStatus: 'COMPLETED', status: nextStatus },
            metadata: { razorpayPaymentId: refs.razorpayPaymentId, razorpayOrderId: refs.razorpayOrderId, via: refs.source },
          },
          db,
        );
      }
    }

    await this.audit.log(
      {
        action: AUDIT_ACTIONS.PAYMENT_CREATED,
        tenantId,
        entity: 'Payment',
        entityId: payment.id,
        metadata: {
          provider: this.providerKey,
          razorpayPaymentId: refs.razorpayPaymentId,
          razorpayOrderId: refs.razorpayOrderId,
          via: refs.source,
        },
      },
      db,
    );
    return true;
  }

  /**
   * Confirms with Razorpay that the payment belongs to this order and covers the full amount.
   * A Razorpay outage does not block checkout because the HMAC signature already proves authenticity.
   */
  private async assertGatewayCapture(
    tenantId: string,
    credentials: { keyId: string; keySecret: string },
    payment: { id: string; amount: Prisma.Decimal; metadata: Prisma.JsonValue | null },
    razorpayOrderId: string,
    razorpayPaymentId: string,
  ): Promise<void> {
    let remote: { order_id?: string | null; amount?: number | string; status?: string; currency?: string };
    try {
      const client = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
      remote = (await client.payments.fetch(razorpayPaymentId)) as typeof remote;
    } catch {
      return;
    }
    const expectedPaise = readMeta(payment.metadata).amountPaise ?? toPaise(payment.amount);
    const problems: string[] = [];
    if (remote.order_id && remote.order_id !== razorpayOrderId) {
      problems.push('order_mismatch');
    }
    if (remote.amount !== undefined && Number(remote.amount) < expectedPaise) {
      problems.push('amount_short');
    }
    if (remote.status && !['captured', 'authorized'].includes(remote.status)) {
      problems.push(`status_${remote.status}`);
    }
    if (problems.length > 0) {
      await this.audit
        .log({
          action: AUDIT_ACTIONS.PAYMENT_GATEWAY_MISMATCH,
          tenantId,
          entity: 'Payment',
          entityId: payment.id,
          metadata: { provider: PROVIDER_KEY, razorpayOrderId, razorpayPaymentId, problems, remoteAmount: remote.amount ?? null, expectedPaise },
        })
        .catch(() => undefined);
      throw new BadRequestException('Payment could not be confirmed with Razorpay.');
    }
  }

  /**
   * Razorpay server-to-server webhook. Handles captures the browser never reported (closed tab, network drop),
   * failed attempts, and refunds processed on the dashboard.
   */
  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    eventId: string | undefined,
  ): Promise<RazorpayWebhookResult> {
    const secret = (process.env.RAZORPAY_WEBHOOK_SECRET ?? '').trim();
    if (!secret) {
      throw new UnauthorizedException('Razorpay webhook secret is not configured.');
    }
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing webhook body or signature.');
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqual(expected, signature)) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature.');
    }

    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookEvent;
    } catch {
      throw new BadRequestException('Webhook body is not valid JSON.');
    }
    const paymentEntity = event.payload?.payment?.entity;
    const refundEntity = event.payload?.refund?.entity;

    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        if (!paymentEntity?.id || !paymentEntity.order_id) {
          return { ok: true, handled: false };
        }
        const payment = await this.findByRazorpayOrder(paymentEntity.order_id, paymentEntity.id);
        if (!payment) {
          return { ok: true, handled: false };
        }
        const expectedPaise = readMeta(payment.metadata).amountPaise ?? toPaise(payment.amount);
        if (Number(paymentEntity.amount ?? 0) < expectedPaise) {
          await this.audit
            .log({
              action: AUDIT_ACTIONS.PAYMENT_GATEWAY_MISMATCH,
              tenantId: payment.tenantId,
              entity: 'Payment',
              entityId: payment.id,
              metadata: { provider: PROVIDER_KEY, eventId, problems: ['amount_short'], remoteAmount: paymentEntity.amount, expectedPaise },
            })
            .catch(() => undefined);
          return { ok: true, handled: false };
        }
        if (payment.status === PaymentStatus.CANCELLED || payment.status === PaymentStatus.FAILED) {
          await this.refundOrphanCapture(payment, paymentEntity.id, Number(paymentEntity.amount ?? 0), eventId);
          return { ok: true, handled: true };
        }
        const completed = await this.prisma.$transaction((tx) =>
          this.completePendingPayment(asTx(tx), payment.tenantId, payment, {
            razorpayOrderId: paymentEntity.order_id as string,
            razorpayPaymentId: paymentEntity.id as string,
            source: 'webhook',
          }),
        );
        if (completed) {
          this.notifications.schedule(
            payment.tenantId,
            'PAYMENT_CONFIRMED',
            formatPaymentConfirmedTelegram({
              orderNumber: payment.order?.orderNumber ?? null,
              paymentId: payment.id,
              amount: moneyString(payment.amount),
              currency: readMeta(payment.metadata).currency ?? 'INR',
              customerName: payment.order?.customer?.name ?? null,
            }),
          );
        }
        return {
          ok: true,
          handled: completed,
          ...(completed && payment.orderId
            ? { captured: { tenantId: payment.tenantId, orderId: payment.orderId, fulfillmentMethod: payment.order?.fulfillmentMethod ?? null } }
            : {}),
        };
      }
      case 'payment.failed': {
        if (!paymentEntity?.order_id) {
          return { ok: true, handled: false };
        }
        const payment = await this.findByRazorpayOrder(paymentEntity.order_id, paymentEntity.id);
        if (!payment) {
          return { ok: true, handled: false };
        }
        // The Razorpay order stays payable, so the local payment remains PENDING for a retry.
        await this.audit
          .log({
            action: AUDIT_ACTIONS.PAYMENT_FAILED,
            tenantId: payment.tenantId,
            entity: 'Payment',
            entityId: payment.id,
            metadata: {
              provider: PROVIDER_KEY,
              eventId,
              razorpayPaymentId: paymentEntity.id,
              reason: paymentEntity.error_reason ?? paymentEntity.error_description ?? null,
            },
          })
          .catch(() => undefined);
        return { ok: true, handled: true };
      }
      case 'refund.processed': {
        const razorpayPaymentId = refundEntity?.payment_id ?? paymentEntity?.id;
        if (!razorpayPaymentId) {
          return { ok: true, handled: false };
        }
        const payment = await this.prisma.payment.findFirst({
          where: { provider: this.providerKey, reference: razorpayPaymentId },
        });
        if (!payment) {
          return { ok: true, handled: false };
        }
        const refundedPaise = Number(paymentEntity?.amount_refunded ?? refundEntity?.amount ?? 0);
        const fullPaise = toPaise(payment.amount);
        const status = refundedPaise >= fullPaise ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status,
            metadata: {
              ...readMeta(payment.metadata),
              refundedPaise,
              lastRefundId: refundEntity?.id ?? null,
            } as Prisma.InputJsonValue,
          },
        });
        await this.audit
          .log({
            action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
            tenantId: payment.tenantId,
            entity: 'Payment',
            entityId: payment.id,
            metadata: { provider: PROVIDER_KEY, eventId, refundId: refundEntity?.id ?? null, refundedPaise },
          })
          .catch(() => undefined);
        return { ok: true, handled: true };
      }
      default:
        return { ok: true, handled: false };
    }
  }

  /**
   * Asks Razorpay whether a still-PENDING local payment was actually captured. Completes it when it was.
   * Returns 'unknown' when Razorpay cannot be reached so callers never cancel a possibly-paid order.
   */
  async reconcilePendingPayment(
    tenantId: string,
    paymentId: string,
  ): Promise<'captured' | 'unpaid' | 'unknown'> {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment || payment.status !== PaymentStatus.PENDING) {
      return payment?.status === PaymentStatus.COMPLETED ? 'captured' : 'unknown';
    }
    const razorpayOrderId = readMeta(payment.metadata).razorpayOrderId;
    if (!razorpayOrderId) {
      return 'unpaid';
    }
    const credentials = await this.paymentSettings.resolveCredentials(tenantId);
    if (!credentials) {
      return 'unknown';
    }
    let items: Array<{ id: string; status?: string; amount?: number }>;
    try {
      const client = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
      const response = (await client.orders.fetchPayments(razorpayOrderId)) as { items?: typeof items };
      items = response.items ?? [];
    } catch {
      return 'unknown';
    }
    const expectedPaise = readMeta(payment.metadata).amountPaise ?? toPaise(payment.amount);
    const captured = items.find((item) => item.status === 'captured' && Number(item.amount ?? 0) >= expectedPaise);
    if (!captured) {
      return items.some((item) => item.status === 'authorized') ? 'unknown' : 'unpaid';
    }
    await this.prisma.$transaction((tx) =>
      this.completePendingPayment(asTx(tx), tenantId, payment, {
        razorpayOrderId,
        razorpayPaymentId: captured.id,
        source: 'webhook',
      }),
    );
    return 'captured';
  }

  /** Money captured for an order that was already cancelled (e.g. paid after expiry) is returned automatically. */
  private async refundOrphanCapture(
    payment: { id: string; tenantId: string; amount: Prisma.Decimal; metadata: Prisma.JsonValue | null },
    razorpayPaymentId: string,
    amountPaise: number,
    eventId: string | undefined,
  ): Promise<void> {
    const credentials = await this.paymentSettings.resolveCredentials(payment.tenantId);
    let refundId: string | null = null;
    let error: string | null = null;
    if (credentials) {
      try {
        const client = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
        const refund = (await client.payments.refund(razorpayPaymentId, {
          amount: amountPaise,
          notes: { reason: 'Order expired before payment was received' },
        })) as { id: string };
        refundId = refund.id;
      } catch (caught) {
        error = caught instanceof Error ? caught.message : 'refund_failed';
      }
    } else {
      error = 'credentials_missing';
    }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        ...(refundId ? { status: PaymentStatus.REFUNDED } : {}),
        metadata: {
          ...readMeta(payment.metadata),
          orphanCapture: { razorpayPaymentId, amountPaise, refundId, error, at: new Date().toISOString() },
        } as Prisma.InputJsonValue,
      },
    });
    await this.audit
      .log({
        action: refundId ? AUDIT_ACTIONS.PAYMENT_REFUNDED : AUDIT_ACTIONS.PAYMENT_GATEWAY_MISMATCH,
        tenantId: payment.tenantId,
        entity: 'Payment',
        entityId: payment.id,
        metadata: { provider: PROVIDER_KEY, eventId, problems: ['captured_after_cancel'], razorpayPaymentId, refundId, error },
      })
      .catch(() => undefined);
  }

  private async findByRazorpayOrder(razorpayOrderId: string, razorpayPaymentId?: string) {
    const include = {
      order: { select: { orderNumber: true, fulfillmentMethod: true, customer: { select: { name: true } } } },
    } as const;
    const direct = await this.prisma.payment.findFirst({
      where: {
        provider: this.providerKey,
        OR: [
          { reference: razorpayOrderId },
          ...(razorpayPaymentId ? [{ reference: razorpayPaymentId }] : []),
          { metadata: { path: ['razorpayOrderId'], equals: razorpayOrderId } },
        ],
      },
      include,
    });
    return direct;
  }

  async refundPayment(input: RefundPaymentInput, tx?: object): Promise<PaymentIntentResult> {
    const credentials = await this.paymentSettings.resolveCredentials(input.tenantId);
    if (!credentials) {
      throw new UnauthorizedException('Razorpay credentials are not configured.');
    }
    const db = tx ? asTx(tx) : asTx(this.prisma);
    const payment = await db.payment.findFirst({ where: { id: input.paymentId, tenantId: input.tenantId } });
    if (!payment) {
      throw new BadRequestException('Payment not found.');
    }
    if (payment.provider !== this.providerKey || payment.method !== PaymentMethod.ONLINE) {
      throw new BadRequestException('Only Razorpay online payments can be refunded through Razorpay.');
    }
    if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestException('Only captured payments can be refunded.');
    }
    const meta = readMeta(payment.metadata);
    const razorpayPaymentId = typeof meta.razorpayPaymentId === 'string' ? meta.razorpayPaymentId : payment.reference;
    if (!razorpayPaymentId) {
      throw new BadRequestException('This payment has no Razorpay payment id to refund.');
    }
    const alreadyRefundedPaise = typeof meta.refundedPaise === 'number' ? meta.refundedPaise : 0;
    const amountPaise = toPaise(input.amount);
    if (amountPaise <= 0 || amountPaise + alreadyRefundedPaise > toPaise(payment.amount)) {
      throw new BadRequestException('Refund amount exceeds the refundable balance.');
    }

    let refund: { id: string; amount?: number; status?: string };
    try {
      const client = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
      refund = (await client.payments.refund(razorpayPaymentId, {
        amount: amountPaise,
        notes: { reason: (input.reason ?? 'Order refund').slice(0, 250) },
      })) as typeof refund;
    } catch (error) {
      this.rethrowRazorpayError(error);
    }

    const refundedPaise = alreadyRefundedPaise + amountPaise;
    const status = refundedPaise >= toPaise(payment.amount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status,
        metadata: { ...meta, refundedPaise, lastRefundId: refund.id } as Prisma.InputJsonValue,
      },
    });
    await this.audit.log(
      {
        action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
        tenantId: input.tenantId,
        entity: 'Payment',
        entityId: payment.id,
        metadata: { provider: PROVIDER_KEY, refundId: refund.id, amountPaise, reason: input.reason ?? null },
      },
      db,
    );
    return {
      paymentId: payment.id,
      status,
      amount: input.amount,
      currency: typeof meta.currency === 'string' ? meta.currency : 'INR',
      method: PaymentMethod.ONLINE,
      provider: this.providerKey,
      nextAction: 'NONE',
    };
  }

  private async createRazorpayOrder(
    credentials: { keyId: string; keySecret: string },
    params: { amount: number; currency: string; receipt: string },
  ): Promise<RazorpayOrderResponse> {
    const client = new Razorpay({
      key_id: credentials.keyId,
      key_secret: credentials.keySecret,
    });
    const order = (await client.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      payment_capture: true,
    })) as RazorpayOrderResponse;
    if (!order?.id) {
      throw new InternalServerErrorException('Razorpay did not return an order id.');
    }
    return order;
  }

  private rethrowRazorpayError(error: unknown): never {
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : undefined;
    const message =
      error && typeof error === 'object' && 'error' in error
        ? String((error as { error?: { description?: string } }).error?.description ?? 'Razorpay request failed')
        : error instanceof Error
          ? error.message
          : 'Razorpay request failed';

    if (status === 401 || status === 403) {
      throw new UnauthorizedException('Razorpay authentication failed. Check your key id and secret.');
    }
    throw new InternalServerErrorException(message);
  }
}
