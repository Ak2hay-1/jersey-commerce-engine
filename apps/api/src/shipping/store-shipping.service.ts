import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  DelhiveryServiceMode,
  ShippingQuoteResult,
  ShippingServiceability,
} from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { money, moneyString, roundMoney } from '../pos/pos-money';
import { ShippingCalculator } from '../orders/shipping.calculator';
import { DelhiveryClient } from './delhivery.client';
import { ShippingSettingsService } from './shipping-settings.service';
import { StoreCartService } from '../store/store-cart.service';

@Injectable()
export class StoreShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: StoreCartService,
    private readonly delhivery: DelhiveryClient,
    private readonly shippingSettings: ShippingSettingsService,
    private readonly shippingCalculator: ShippingCalculator,
  ) {}

  async serviceability(tenantId: string, postalCode: string): Promise<ShippingServiceability> {
    const credentials = await this.shippingSettings.resolveCredentials(tenantId);
    if (!credentials) {
      return {
        postalCode,
        serviceable: true,
        codAvailable: false,
        prepaidAvailable: true,
        message: 'Delhivery is not enabled; pincode check skipped.',
      };
    }
    return this.delhivery.checkServiceability(credentials, postalCode);
  }

  async quote(
    tenantId: string,
    cartToken: string | undefined,
    postalCode: string,
    mode?: DelhiveryServiceMode,
    cod?: boolean,
  ): Promise<ShippingQuoteResult> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException('Store is not available.');
    }
    const settingsRow = await this.shippingSettings.getRecord(tenantId);
    const credentials = await this.shippingSettings.resolveCredentials(tenantId);
    const serviceability = credentials
      ? await this.delhivery.checkServiceability(credentials, postalCode)
      : {
          postalCode,
          serviceable: true,
          codAvailable: false,
          prepaidAvailable: true,
        };

    const cart = await this.carts.requireActiveCart(tenantId, cartToken).catch(() => null);
    const weightKg = await this.cartWeightKg(tenantId, cart, settingsRow?.defaultPackageWeightKg);
    const merchandise = cart
      ? cart.items.reduce(
          (sum, item) => sum.add(money(item.productVariant.sellingPrice.toString()).mul(item.quantity)),
          money(0),
        )
      : money(0);

    const calc = this.shippingCalculator.quote('DELIVERY', merchandise, {
      shippingCalculationMode: tenant.shippingCalculationMode,
      shippingFixedAmount: tenant.shippingFixedAmount,
      freeShippingMinSubtotal: tenant.freeShippingMinSubtotal,
    });

    if (tenant.shippingCalculationMode !== 'DELHIVERY' || !credentials) {
      return {
        serviceability,
        rates: [],
        selectedMode: null,
        shippingAmount: moneyString(calc.amount),
        calculationMode: calc.mode,
      };
    }

    if (!serviceability.serviceable) {
      return {
        serviceability,
        rates: [],
        selectedMode: null,
        shippingAmount: '0.00',
        calculationMode: 'DELHIVERY',
      };
    }

    const origin = settingsRow?.warehousePostalCode?.trim();
    if (!origin) {
      throw new BadRequestException('Warehouse pincode is not configured for Delhivery quotes.');
    }

    const preferred = mode ?? settingsRow?.delhiveryServiceMode ?? 'SURFACE';
    const modes: DelhiveryServiceMode[] = preferred === 'EXPRESS' ? ['EXPRESS', 'SURFACE'] : ['SURFACE', 'EXPRESS'];
    const rates = await this.delhivery.estimateRates(credentials, {
      originPostalCode: origin,
      destinationPostalCode: postalCode,
      weightKg,
      codAmount: cod ? 1 : 0,
      modes,
    });
    const selected = rates.find((rate) => rate.mode === preferred) ?? rates[0] ?? null;
    return {
      serviceability,
      rates: rates.map((rate) => ({
        mode: rate.mode,
        amount: roundMoney(money(rate.amount)).toFixed(2),
        currency: tenant.currency,
        estimatedDays: rate.estimatedDays,
      })),
      selectedMode: selected?.mode ?? null,
      shippingAmount: selected ? roundMoney(money(selected.amount)).toFixed(2) : '0.00',
      calculationMode: 'DELHIVERY',
    };
  }

  private async cartWeightKg(
    tenantId: string,
    cart: Awaited<ReturnType<StoreCartService['requireActiveCart']>> | null,
    fallbackDecimal?: Prisma.Decimal | null,
  ): Promise<number> {
    const fallback = Number(fallbackDecimal?.toString() ?? '0.5');
    if (!cart) {
      return Math.max(0.1, fallback);
    }
    const variants = await this.prisma.productVariant.findMany({
      where: { tenantId, id: { in: cart.items.map((item) => item.productVariantId) } },
      select: { id: true, weight: true },
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant.weight]));
    let total = 0;
    for (const item of cart.items) {
      const weight = byId.get(item.productVariantId);
      total += (weight ? Number(weight.toString()) : fallback) * item.quantity;
    }
    return Math.max(0.1, Number(total.toFixed(3)));
  }
}
