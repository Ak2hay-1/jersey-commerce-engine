import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma } from '../prisma/client';
import { parseMoney } from '../catalog/money';
import { money, roundMoney } from '../pos/pos-money';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import type { PaymentCaptureInput, PreparedPayment, PreparedRefundPayment } from './payment.types';

export interface SplitPaymentInput extends Omit<PaymentCaptureInput, 'amount' | 'amountReceived'> {
  amount?: Prisma.Decimal | string | null;
  amountReceived?: Prisma.Decimal | string | null;
}

@Injectable()
export class PaymentProcessor {
  constructor(private readonly registry: PaymentProviderRegistry) {}

  prepareCaptures(total: Prisma.Decimal, inputs: SplitPaymentInput[]): PreparedPayment[] {
    if (!inputs.length) {
      throw new BadRequestException('At least one payment is required.');
    }
    if (total.lt(0)) {
      throw new BadRequestException('Sale total cannot be negative.');
    }
    const billedAmounts = this.resolveBilledAmounts(roundMoney(total), inputs);
    const prepared = inputs.map((input, index) => {
      const provider = this.registry.resolve(input.method);
      const billed = billedAmounts[index];
      if (!billed) {
        throw new BadRequestException('Each payment must include a positive amount.');
      }
      const amountReceived =
        input.amountReceived == null || input.amountReceived === ''
          ? null
          : input.amountReceived instanceof Prisma.Decimal
            ? input.amountReceived
            : parseMoney(String(input.amountReceived), 'amountReceived');
      return provider.capture(
        {
          method: input.method,
          amount: billed,
          amountReceived,
          reference: input.reference,
          provider: input.provider,
          confirmed: input.confirmed,
          metadata: input.metadata,
        },
        billed,
      );
    });
    const completed = prepared.filter((payment) => payment.status === PaymentStatus.COMPLETED);
    const completedSum = roundMoney(completed.reduce((acc, payment) => acc.add(payment.amount), money(0)));
    if (prepared.some((payment) => payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.FAILED)) {
      throw new BadRequestException('All payments must complete before the sale can be finalized.');
    }
    if (!completedSum.eq(roundMoney(total))) {
      throw new BadRequestException('Payment amounts must equal the sale total. Incomplete or overpaid sales are not allowed.');
    }
    this.assertUniqueReferences(prepared);
    return prepared;
  }

  prepareRefund(input: {
    method: PaymentMethod;
    amount: Prisma.Decimal;
    confirmed?: boolean;
    reference?: string | null;
    provider?: string | null;
    metadata?: Record<string, unknown> | null;
  }): PreparedRefundPayment {
    return this.registry.resolve(input.method).refund({
      method: input.method,
      amount: roundMoney(input.amount),
      confirmed: input.confirmed,
      reference: input.reference,
      provider: input.provider,
      metadata: input.metadata,
    });
  }

  private resolveBilledAmounts(total: Prisma.Decimal, inputs: SplitPaymentInput[]): Prisma.Decimal[] {
    const single = inputs[0];
    if (inputs.length === 1 && single && (single.amount == null || single.amount === '')) {
      return [total];
    }
    return inputs.map((input) => {
      if (input.amount == null || input.amount === '') {
        throw new BadRequestException('Each payment must include a positive amount when splitting a sale.');
      }
      const amount =
        input.amount instanceof Prisma.Decimal ? input.amount : parseMoney(String(input.amount), 'amount');
      if (amount.lte(0)) {
        throw new BadRequestException('Each payment must include a positive amount.');
      }
      return roundMoney(amount);
    });
  }

  private assertUniqueReferences(payments: PreparedPayment[]) {
    const seen = new Set<string>();
    for (const payment of payments) {
      if (!payment.reference) {
        continue;
      }
      const key = `${payment.method}:${payment.reference.trim().toLowerCase()}`;
      if (seen.has(key)) {
        throw new BadRequestException('Duplicate payment references are not allowed.');
      }
      seen.add(key);
    }
  }
}
