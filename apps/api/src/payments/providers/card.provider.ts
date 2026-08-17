import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, type Prisma } from '../../prisma/client';
import { roundMoney } from '../../pos/pos-money';
import { normalizeReference, sanitizePaymentMetadata } from '../payment.sanitize';
import type { PaymentCaptureInput, PaymentProvider, PaymentRefundInput, PreparedPayment } from '../payment.types';

export class CardPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.CARD;

  capture(input: PaymentCaptureInput, billedAmount: Prisma.Decimal): PreparedPayment {
    this.assertPositive(billedAmount, 'Card payment');
    if (input.confirmed !== true) {
      throw new BadRequestException(
        'Card payment must be explicitly confirmed by the cashier. Card numbers, CVV, and PINs are never stored.',
      );
    }
    const reference = normalizeReference(input.reference);
    if (!reference) {
      throw new BadRequestException('A card terminal reference or approval code is required.');
    }
    return {
      amount: billedAmount,
      method: this.method,
      status: PaymentStatus.COMPLETED,
      amountReceived: null,
      changeDue: null,
      reference,
      provider: input.provider?.trim() || 'MANUAL_CARD_TERMINAL',
      metadata: {
        ...sanitizePaymentMetadata(input.metadata),
        confirmationType: 'CASHIER_CONFIRMED',
        gatewayConfirmed: false,
      },
    };
  }

  refund(input: PaymentRefundInput) {
    this.assertPositive(input.amount, 'Card refund');
    if (input.confirmed !== true) {
      throw new BadRequestException(
        'Card refund must be explicitly confirmed by the cashier. No card scheme or gateway refund is claimed.',
      );
    }
    return {
      amount: roundMoney(input.amount),
      method: this.method,
      status: PaymentStatus.COMPLETED,
      reference: normalizeReference(input.reference),
      provider: input.provider?.trim() || 'MANUAL_CARD_TERMINAL',
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
}
