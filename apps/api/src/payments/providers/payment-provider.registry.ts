import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod } from '../../prisma/client';
import type { PaymentProvider } from '../payment.types';
import { BankTransferPaymentProvider } from './bank-transfer.provider';
import { CardPaymentProvider } from './card.provider';
import { CashPaymentProvider } from './cash.provider';
import { ManualUpiPaymentProvider } from './manual-upi.provider';
import { OnlinePaymentProvider } from './online.provider';
import { OtherPaymentProvider } from './other.provider';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<PaymentMethod, PaymentProvider>;

  constructor() {
    const list: PaymentProvider[] = [
      new CashPaymentProvider(),
      new ManualUpiPaymentProvider(),
      new CardPaymentProvider(),
      new OnlinePaymentProvider(),
      new BankTransferPaymentProvider(),
      new OtherPaymentProvider(),
    ];
    this.providers = new Map(list.map((provider) => [provider.method, provider]));
  }

  resolve(method: PaymentMethod | string): PaymentProvider {
    const provider = this.providers.get(method as PaymentMethod);
    if (!provider) {
      throw new BadRequestException(`Unsupported payment method: ${method}`);
    }
    return provider;
  }
}
