import type { PaymentMethod, PaymentStatus } from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';

export interface PaymentCaptureInput {
  method: PaymentMethod;
  amount?: Prisma.Decimal | null;
  amountReceived?: Prisma.Decimal | null;
  reference?: string | null;
  provider?: string | null;
  confirmed?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface PreparedPayment {
  amount: Prisma.Decimal;
  method: PaymentMethod;
  status: PaymentStatus;
  amountReceived: Prisma.Decimal | null;
  changeDue: Prisma.Decimal | null;
  reference: string | null;
  provider: string | null;
  metadata: Prisma.InputJsonValue;
}

export interface PaymentRefundInput {
  method: PaymentMethod;
  amount: Prisma.Decimal;
  confirmed?: boolean;
  reference?: string | null;
  provider?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PreparedRefundPayment {
  amount: Prisma.Decimal;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  provider: string | null;
  metadata: Prisma.InputJsonValue;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  capture(input: PaymentCaptureInput, billedAmount: Prisma.Decimal): PreparedPayment;
  refund(input: PaymentRefundInput): PreparedRefundPayment;
}
