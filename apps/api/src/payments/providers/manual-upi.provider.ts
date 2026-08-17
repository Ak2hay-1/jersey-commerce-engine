import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, type Prisma } from '../../prisma/client';
import { roundMoney } from '../../pos/pos-money';
import { normalizeReference, sanitizePaymentMetadata } from '../payment.sanitize';
import type { PaymentCaptureInput, PaymentProvider, PaymentRefundInput, PreparedPayment } from '../payment.types';

export class ManualUpiPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.UPI;

  capture(input: PaymentCaptureInput, billedAmount: Prisma.Decimal): PreparedPayment {
    this.assertPositive(billedAmount, 'UPI payment');
    this.assertCashierConfirmed(input.confirmed, 'UPI payment');
    const reference = normalizeReference(input.reference);
    if (!reference) {
      throw new BadRequestException('A UPI transaction reference is required.');
    }
    return {
      amount: billedAmount,
      method: this.method,
      status: PaymentStatus.COMPLETED,
      amountReceived: null,
      changeDue: null,
      reference,
      provider: input.provider?.trim() || 'MANUAL_UPI',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'CASHIER_CONFIRMED',
        gatewayConfirmed: false,
      },
    };
  }

  refund(input: PaymentRefundInput) {
    this.assertPositive(input.amount, 'UPI refund');
    this.assertCashierConfirmed(input.confirmed, 'UPI refund');
    return {
      amount: roundMoney(input.amount),
      method: this.method,
      status: PaymentStatus.COMPLETED,
      reference: normalizeReference(input.reference),
      provider: input.provider?.trim() || 'MANUAL_UPI',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'CASHIER_CONFIRMED',
        gatewayConfirmed: false,
      },
    };
  }

  private assertPositive(amount: Prisma.Decimal, label: string) {
    if (amount.lte(0)) {
      throw new BadRequestException(`${label} amount must be greater than zero.`);
    }
  }

  private assertCashierConfirmed(confirmed: boolean | undefined, label: string) {
    if (confirmed !== true) {
      throw new BadRequestException(
        `${label} must be explicitly confirmed by the cashier. This is not a payment-gateway confirmation.`,
      );
    }
  }
}
