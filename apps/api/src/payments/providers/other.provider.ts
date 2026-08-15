import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, type Prisma } from '../../prisma/client';
import { roundMoney } from '../../pos/pos-money';
import { normalizeReference, sanitizePaymentMetadata } from '../payment.sanitize';
import type { PaymentCaptureInput, PaymentProvider, PaymentRefundInput, PreparedPayment } from '../payment.types';

export class OtherPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.OTHER;

  capture(input: PaymentCaptureInput, billedAmount: Prisma.Decimal): PreparedPayment {
    if (billedAmount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }
    if (input.confirmed !== true) {
      throw new BadRequestException('OTHER payments must be explicitly confirmed by the cashier.');
    }
    return {
      amount: billedAmount,
      method: this.method,
      status: PaymentStatus.COMPLETED,
      amountReceived: null,
      changeDue: null,
      reference: normalizeReference(input.reference),
      provider: input.provider?.trim() || 'MANUAL_OTHER',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'CASHIER_CONFIRMED',
        gatewayConfirmed: false,
      },
    };
  }

  refund(input: PaymentRefundInput) {
    if (input.amount.lte(0)) {
      throw new BadRequestException('Refund amount must be greater than zero.');
    }
    if (input.confirmed !== true) {
      throw new BadRequestException('OTHER refunds must be explicitly confirmed by the cashier.');
    }
    return {
      amount: roundMoney(input.amount),
      method: this.method,
      status: PaymentStatus.COMPLETED,
      reference: normalizeReference(input.reference),
      provider: input.provider?.trim() || 'MANUAL_OTHER',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'CASHIER_CONFIRMED',
        gatewayConfirmed: false,
      },
    };
  }
}
