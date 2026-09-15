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

  /**
   * Creates a Razorpay order for an amount in paise (minimum 100).
   */
  async createRazorpayOrderForAmount(
    tenantId: string,
    input: { amountPaise: number; currency?: string; receipt?: string },
  ): Promise<{ order_id: string; amount: number; currency: string; key_id: string }> {
    const credentials = await this.paymentSettings.resolveCredentials(tenantId);
    if (!credentials) {
      throw new UnauthorizedException('Razorpay credentials are not configured.');
    }
    if (!Number.isFinite(input.amountPaise) || input.amountPaise < MIN_AMOUNT_PAISE) {
      throw new BadRequestException(`Amount must be at least ${MIN_AMOUNT_PAISE} paise.`);
    }
    const currency = (input.currency || 'INR').toUpperCase();
    try {
      const order = await this.createRazorpayOrder(credentials, {
        amount: Math.round(input.amountPaise),
        currency,
        receipt: (input.receipt ?? `rcpt_${Date.now()}`).slice(0, 40),
      });
      return {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: credentials.keyId,
      };
    } catch (error) {
      this.rethrowRazorpayError(error);
    }
  }

  async verifyCheckoutPayment(
    tenantId: string,
    input: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ): Promise<{ success: true; paymentId: string; orderNumber: string | null }> {
    return this.prisma.$transaction(async (tx) => {
      const result = await this.verifyPayment(
        {
          tenantId,
          paymentId: '',
          providerReference: input.razorpay_order_id,
          payload: input,
        },
        tx,
      );
      const payment = await asTx(tx).payment.findFirst({
        where: { id: result.paymentId, tenantId },
        include: { order: { select: { orderNumber: true } } },
      });
      return {
        success: true as const,
        paymentId: result.paymentId,
        orderNumber: payment?.order?.orderNumber ?? null,
      };
    });
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

    if (expected !== razorpaySignature) {
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

      const prevMeta = readMeta(payment.metadata);
      const updated = await db.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          reference: razorpayPaymentId,
          amountReceived: payment.amount,
          metadata: {
            ...prevMeta,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            verifiedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      if (payment.orderId) {
        const order = await db.order.findFirst({ where: { id: payment.orderId, tenantId: input.tenantId } });
        if (order && order.paymentStatus !== 'COMPLETED') {
          await db.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'COMPLETED',
              status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
              confirmedAt: order.confirmedAt ?? new Date(),
            },
          });
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.ORDER_PAYMENT_STATE_CHANGED,
              tenantId: input.tenantId,
              entity: 'Order',
              entityId: order.id,
              oldValue: { paymentStatus: order.paymentStatus, status: order.status },
              newValue: {
                paymentStatus: 'COMPLETED',
                status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
              },
              metadata: { razorpayPaymentId, razorpayOrderId },
            },
            db,
          );
        }
      }

      await this.audit.log(
        {
          action: AUDIT_ACTIONS.PAYMENT_CREATED,
          tenantId: input.tenantId,
          entity: 'Payment',
          entityId: updated.id,
          metadata: { provider: this.providerKey, razorpayPaymentId, razorpayOrderId },
        },
        db,
      );

      return {
        paymentId: updated.id,
        status: PaymentStatus.COMPLETED,
        amount: updated.amount,
        currency: typeof prevMeta.currency === 'string' ? prevMeta.currency : 'INR',
        method: PaymentMethod.ONLINE,
        provider: this.providerKey,
        nextAction: 'NONE' as const,
        checkout: {
          razorpayOrderId,
          razorpayKeyId: typeof prevMeta.razorpayKeyId === 'string' ? prevMeta.razorpayKeyId : credentials.keyId,
          amountPaise: typeof prevMeta.amountPaise === 'number' ? prevMeta.amountPaise : toPaise(updated.amount),
        },
      };
    };

    if (tx) {
      return run(asTx(tx));
    }
    return this.prisma.$transaction((inner) => run(asTx(inner)));
  }

  refundPayment(_input: RefundPaymentInput, _tx?: object): Promise<PaymentIntentResult> {
    throw new BadRequestException('Razorpay refunds are not available from this endpoint yet.');
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
