import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, type Prisma } from '../../prisma/client';
import { roundMoney } from '../../pos/pos-money';
import { normalizeReference, sanitizePaymentMetadata } from '../payment.sanitize';
import type { PaymentCaptureInput, PaymentProvider, PaymentRefundInput, PreparedPayment } from '../payment.types';

export class CashPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.CASH;

  capture(input: PaymentCaptureInput, billedAmount: Prisma.Decimal): PreparedPayment {
    if (billedAmount.lte(0)) {
      throw new BadRequestException('Cash payment amount must be greater than zero.');
    }
    if (input.amountReceived == null) {
      throw new BadRequestException('amountReceived is required for cash payments.');
    }
    const amountReceived = roundMoney(input.amountReceived);
    if (amountReceived.lt(billedAmount)) {
      throw new BadRequestException('Amount received must be greater than or equal to the cash amount due.');
    }
    const changeDue = roundMoney(amountReceived.sub(billedAmount));
    if (changeDue.isNegative()) {
      throw new BadRequestException('Change due cannot be negative.');
    }
    return {
      amount: billedAmount,
      method: this.method,
      status: PaymentStatus.COMPLETED,
      amountReceived,
      changeDue,
      reference: normalizeReference(input.reference),
      provider: input.provider?.trim() || 'CASH_DRAWER',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'CASHIER_CAPTURED',
        gatewayConfirmed: false,
        total: billedAmount.toFixed(2),
        amountReceived: amountReceived.toFixed(2),
        changeDue: changeDue.toFixed(2),
      },
    };
  }

  refund(input: PaymentRefundInput) {
    if (input.amount.lte(0)) {
      throw new BadRequestException('Cash refund amount must be greater than zero.');
    }
    return {
      amount: roundMoney(input.amount),
      method: this.method,
      status: PaymentStatus.COMPLETED,
      reference: normalizeReference(input.reference),
      provider: input.provider?.trim() || 'CASH_DRAWER',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'CASH_REFUND',
        gatewayConfirmed: false,
      },
    };
  }
}
