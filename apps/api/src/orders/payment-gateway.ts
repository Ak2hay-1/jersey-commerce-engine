import type { PaymentMethod, PaymentStatus } from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';

export type PaymentIntentNextAction = 'AWAIT_GATEWAY' | 'NONE';

export interface CreatePaymentIntentInput {
  tenantId: string;
  orderId: string;
  amount: Prisma.Decimal;
  currency: string;
  customerId?: string | null;
  createdById?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PaymentIntentResult {
  paymentId: string;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  method: PaymentMethod;
  provider: string | null;
  nextAction: PaymentIntentNextAction;
}

export interface VerifyPaymentInput {
  tenantId: string;
  paymentId: string;
  providerReference: string;
  payload?: Record<string, unknown>;
}

export interface RefundPaymentInput {
  tenantId: string;
  paymentId: string;
  amount: Prisma.Decimal;
  reason?: string;
}

/**
 * Online checkout gateway port. Implementations must not invent a successful capture.
 * A real provider is registered later; the unconfigured adapter only creates PENDING intents.
 */
export interface PaymentGateway {
  readonly providerKey: string;
  createPaymentIntent(input: CreatePaymentIntentInput, tx: object): Promise<PaymentIntentResult>;
  verifyPayment(input: VerifyPaymentInput, tx?: object): Promise<PaymentIntentResult>;
  refundPayment(input: RefundPaymentInput, tx?: object): Promise<PaymentIntentResult>;
}
