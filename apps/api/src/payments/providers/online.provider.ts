import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, type Prisma } from '../../prisma/client';
import type { PaymentCaptureInput, PaymentProvider, PaymentRefundInput, PreparedPayment, PreparedRefundPayment } from '../payment.types';

/**
 * Placeholder for a future gateway. Capture never reports success.
 */
export class OnlinePaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.ONLINE;

  capture(_input: PaymentCaptureInput, _billedAmount: Prisma.Decimal): PreparedPayment {
    throw new BadRequestException(
      'Online payment gateway is not configured. This system will not record a successful ONLINE capture until a real provider confirms it.',
    );
  }

  refund(_input: PaymentRefundInput): PreparedRefundPayment {
    throw new BadRequestException(
      'Online refunds are not available until a payment gateway is connected. This is not a successful gateway refund.',
    );
  }
}
