import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, type Prisma } from '../../prisma/client';
import { roundMoney } from '../../pos/pos-money';
import { normalizeReference, sanitizePaymentMetadata } from '../payment.sanitize';
import type { PaymentCaptureInput, PaymentProvider, PaymentRefundInput, PreparedPayment } from '../payment.types';

export class BankTransferPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.BANK_TRANSFER;

  capture(input: PaymentCaptureInput, billedAmount: Prisma.Decimal): PreparedPayment {
    if (billedAmount.lte(0)) {
      throw new BadRequestException('Bank transfer amount must be greater than zero.');
    }
    if (input.confirmed !== true) {
      throw new BadRequestException(
        'BANK_TRANSFER payments must be explicitly confirmed by staff. This is not a payment-gateway confirmation.',
      );
    }
    const reference = normalizeReference(input.reference);
    if (!reference) {
      throw new BadRequestException('A bank transfer reference is required.');
    }
    return {
      amount: billedAmount,
      method: this.method,
      status: PaymentStatus.COMPLETED,
      amountReceived: null,
      changeDue: null,
      reference,
      provider: input.provider?.trim() || 'MANUAL_BANK_TRANSFER',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'STAFF_CONFIRMED',
        gatewayConfirmed: false,
      },
    };
  }

  refund(input: PaymentRefundInput) {
    if (input.amount.lte(0)) {
      throw new BadRequestException('Bank transfer refund amount must be greater than zero.');
    }
    if (input.confirmed !== true) {
      throw new BadRequestException('BANK_TRANSFER refunds must be explicitly confirmed by staff.');
    }
    return {
      amount: roundMoney(input.amount),
      method: this.method,
      status: PaymentStatus.COMPLETED,
      reference: normalizeReference(input.reference),
      provider: input.provider?.trim() || 'MANUAL_BANK_TRANSFER',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'STAFF_CONFIRMED',
        gatewayConfirmed: false,
      },
    };
  }
}
