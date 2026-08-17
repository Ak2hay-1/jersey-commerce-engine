import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { FulfillmentMethod, ShippingCalculationMode } from '@jersey-commerce/types';
import { money, roundMoney } from '../pos/pos-money';

export interface ShippingSettings {
  shippingCalculationMode: ShippingCalculationMode;
  shippingFixedAmount: Prisma.Decimal;
  freeShippingMinSubtotal: Prisma.Decimal | null;
}

export interface ShippingQuote {
  amount: Prisma.Decimal;
  mode: ShippingCalculationMode | 'PICKUP' | 'FREE_THRESHOLD';
}

@Injectable()
export class ShippingCalculator {
  quote(
    fulfillmentMethod: FulfillmentMethod,
    merchandiseNet: Prisma.Decimal,
    settings: ShippingSettings,
  ): ShippingQuote {
    if (fulfillmentMethod === 'STORE_PICKUP') {
      return { amount: money(0), mode: 'PICKUP' };
    }
    if (settings.shippingCalculationMode === 'FREE') {
      return { amount: money(0), mode: 'FREE' };
    }
    const threshold = settings.freeShippingMinSubtotal;
    if (threshold && !threshold.isZero() && merchandiseNet.gte(threshold)) {
      return { amount: money(0), mode: 'FREE_THRESHOLD' };
    }
    return { amount: roundMoney(settings.shippingFixedAmount), mode: 'FIXED' };
  }
}
