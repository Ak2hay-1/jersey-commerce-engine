import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma } from '../prisma/client';
import { asTx } from '../prisma/as-tx';
import { PaymentsService } from '../payments/payments.service';
import type {
  CreatePaymentIntentInput,
  PaymentGateway,
  PaymentIntentResult,
  RefundPaymentInput,
  VerifyPaymentInput,
} from './payment-gateway';

const UNCONFIGURED_MESSAGE =
  'Online payment gateway is not configured. This system will not record a successful ONLINE capture until a real provider confirms it.';

@Injectable()
export class UnconfiguredOnlineGateway implements PaymentGateway {
  readonly providerKey = 'unconfigured';

  constructor(private readonly payments: PaymentsService) {}

  async createPaymentIntent(input: CreatePaymentIntentInput, tx: object): Promise<PaymentIntentResult> {
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

  verifyPayment(_input: VerifyPaymentInput, _tx?: object): Promise<PaymentIntentResult> {
    throw new BadRequestException(UNCONFIGURED_MESSAGE);
  }

  refundPayment(_input: RefundPaymentInput, _tx?: object): Promise<PaymentIntentResult> {
    throw new BadRequestException(
      'Online refunds are not available until a payment gateway is connected. This is not a successful gateway refund.',
    );
  }

  async loadIntent(tenantId: string, paymentId: string, tx: object): Promise<PaymentIntentResult | null> {
    const payment = await asTx(tx).payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment) {
      return null;
    }
    const metadata = payment.metadata && typeof payment.metadata === 'object' ? (payment.metadata as { currency?: string }) : {};
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: metadata.currency ?? 'INR',
      method: payment.method,
      provider: payment.provider,
      nextAction: payment.status === PaymentStatus.PENDING ? 'AWAIT_GATEWAY' : 'NONE',
    };
  }
}
