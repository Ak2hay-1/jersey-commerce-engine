import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CatalogStatus, Prisma, VariantStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { TokenService } from '../auth/token.service';
import { CustomersService } from '../customers/customers.service';
import { RedisService } from '../redis/redis.service';
import { parseMoney, moneyString } from '../catalog/money';
import { money } from '../pos/pos-money';
import { OrderEngineService } from '../orders/order-engine.service';
import { ShippingCalculator } from '../orders/shipping.calculator';
import { priceOrderLines } from '../orders/order-pricing';
import { parseTaxRate } from '../finance/tax';
import { availableQuantity } from '../inventory/inventory-math';
import type { CheckoutIssue, CheckoutQuote, FulfillmentMethod } from '@jersey-commerce/types';
import { toCartDto } from './store-cart.mapper';
import { toOrderDetail } from '../orders/order.mapper';
import type { StaffCreateOrderDto, StoreCheckoutDto } from '../orders/dto/order.dto';
import type { AuthPrincipal } from '../common/context/request-context';
import type { RequestMeta } from '../auth/auth-session.service';
import { StoreCartService } from './store-cart.service';
import { hashOpaqueToken } from '../common/crypto/token-hash';
import { assertPromoApplicable } from '../promo-codes/promo-code.engine';
import { PromoCodesService } from '../promo-codes/promo-codes.service';

const TX_OPTIONS = {
  maxWait: 5_000,
  timeout: 25_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

@Injectable()
export class StoreCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly carts: StoreCartService,
    private readonly engine: OrderEngineService,
    private readonly customers: CustomersService,
    private readonly tokens: TokenService,
    private readonly redis: RedisService,
    private readonly shipping: ShippingCalculator,
    private readonly promoCodes: PromoCodesService,
  ) {}

  async quote(tenantId: string, token: string | undefined, fulfillmentMethod: FulfillmentMethod = 'DELIVERY'): Promise<CheckoutQuote> {
    const issues: CheckoutIssue[] = [];
    let cartRecord;
    try {
      cartRecord = await this.carts.requireActiveCart(tenantId, token);
    } catch {
      return {
        cart: {
          id: '',
          status: 'EXPIRED',
          itemCount: 0,
          items: [],
          totals: {
            subtotal: '0.00',
            discount: '0.00',
            tax: '0.00',
            shippingAmount: '0.00',
            total: '0.00',
            currency: 'INR',
          },
          promoCode: null,
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        totals: {
          subtotal: '0.00',
          discount: '0.00',
          tax: '0.00',
          shippingAmount: '0.00',
          total: '0.00',
          currency: 'INR',
        },
        fulfillmentMethod,
        issues: [{ code: 'CART_EXPIRED', message: 'Your cart has expired. Add items again to continue.' }],
        canCheckout: false,
      };
    }
    const cart = toCartDto(cartRecord, { currency: await this.currency(tenantId) });
    if (cart.items.length === 0) {
      issues.push({ code: 'CART_EMPTY', message: 'Your cart is empty.' });
    }
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException('Store is not available.');
    }
    const pricedInputs = [];
    for (const item of cartRecord.items) {
      const variant = item.productVariant;
      const product = variant.product;
      if (product.status !== CatalogStatus.ACTIVE || variant.status !== VariantStatus.ACTIVE) {
        issues.push({
          code: 'ITEM_UNAVAILABLE',
          message: `${product.name} is no longer available.`,
          itemId: item.publicId,
          productName: product.name,
        });
        continue;
      }
      const available = availableQuantity(variant.inventory?.quantity ?? 0, variant.inventory?.reservedQuantity ?? 0);
      if (available < item.quantity) {
        issues.push({
          code: 'INSUFFICIENT_STOCK',
          message: `${product.name} does not have enough stock.`,
          itemId: item.publicId,
          productName: product.name,
        });
      }
      const current = money(variant.sellingPrice.toString());
      if (!current.eq(item.unitPrice)) {
        issues.push({
          code: 'PRICE_CHANGED',
          message: `The price of ${product.name} has changed.`,
          itemId: item.publicId,
          productName: product.name,
        });
      }
      pricedInputs.push({
        productVariantId: variant.id,
        productName: product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        quantity: item.quantity,
        unitPrice: current,
        costPrice: money(variant.costPrice.toString()),
        taxRate: parseTaxRate(variant.taxRate ?? tenant.defaultTaxRate),
        taxInclusive: variant.taxInclusive ?? tenant.taxInclusivePricing,
      });
    }
    let totals = cart.totals;
    if (pricedInputs.length > 0) {
      const provisional = priceOrderLines(pricedInputs, 'NONE', money(0), money(0));
      let discountType: 'NONE' | 'FIXED' | 'PERCENTAGE' = 'NONE';
      let discountValue = money(0);
      if (cartRecord.promoCode) {
        try {
          const resolved = assertPromoApplicable(cartRecord.promoCode, provisional.subtotal);
          discountType = resolved.discountType;
          discountValue = resolved.discountValue;
        } catch (error) {
          issues.push({
            code: 'PROMO_INVALID',
            message: error instanceof Error ? error.message : 'This promo code cannot be applied.',
          });
        }
      }
      const afterDiscount = priceOrderLines(pricedInputs, discountType, discountValue, money(0));
      const shippingQuote = this.shipping.quote(fulfillmentMethod, afterDiscount.total, {
        shippingCalculationMode: tenant.shippingCalculationMode,
        shippingFixedAmount: tenant.shippingFixedAmount,
        freeShippingMinSubtotal: tenant.freeShippingMinSubtotal,
      });
      const priced = priceOrderLines(pricedInputs, discountType, discountValue, shippingQuote.amount);
      totals = {
        subtotal: moneyString(priced.subtotal) ?? '0.00',
        discount: moneyString(priced.discount) ?? '0.00',
        tax: moneyString(priced.tax) ?? '0.00',
        shippingAmount: moneyString(priced.shippingAmount) ?? '0.00',
        total: moneyString(priced.total) ?? '0.00',
        currency: tenant.currency,
      };
    }
    return {
      cart: { ...cart, totals },
      totals,
      fulfillmentMethod,
      issues,
      canCheckout: issues.filter((issue) => issue.code !== 'PRICE_CHANGED').length === 0 && pricedInputs.length > 0,
    };
  }

  private async currency(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId }, select: { currency: true } });
    return tenant?.currency ?? 'INR';
  }

  async checkout(
    tenantId: string,
    token: string | undefined,
    dto: StoreCheckoutDto,
    idempotencyKey: string | undefined,
    meta?: RequestMeta,
    customerId?: string,
  ) {
    const cart = await this.carts.requireActiveCart(tenantId, token);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty.');
    }
    const fingerprint = this.fingerprint({
      cartPublicId: cart.publicId,
      fulfillmentMethod: dto.fulfillmentMethod ?? 'DELIVERY',
      customer: dto.customer,
      shippingAddress: dto.shippingAddress,
      notes: dto.notes,
      promoCodeId: cart.promoCodeId,
    });
    if (idempotencyKey) {
      const replay = await this.findReplay(tenantId, idempotencyKey, fingerprint);
      if (replay) {
        return replay;
      }
    }
    const lockKey = `checkout:${tenantId}:${cart.publicId}`;
    let locked: string | null = '1';
    try {
      locked = await this.redis.getClient().set(lockKey, '1', 'EX', 30, 'NX');
    } catch {
      locked = '1';
    }
    if (!locked) {
      throw new ConflictException('Checkout is already in progress for this cart.');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lockedCart = await asTx(tx).$queryRaw<Array<{ id: string; status: string }>>`
          SELECT id, status FROM carts WHERE id = ${cart.id} AND tenant_id = ${tenantId} FOR UPDATE
        `;
        if (!lockedCart[0] || lockedCart[0].status !== 'ACTIVE') {
          throw new ConflictException('This cart has already been checked out.');
        }
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.CHECKOUT_STARTED,
            tenantId,
            entity: 'Cart',
            entityId: cart.id,
            metadata: { publicId: cart.publicId, source: 'WEBSITE' },
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
          },
          tx,
        );
        if (idempotencyKey) {
          await this.claimIdempotency(tx, tenantId, idempotencyKey, fingerprint, cart.id);
        }
        const customer = await this.customers.resolveForOrder(
          tenantId,
          {
            customerId,
            name: dto.customer?.name ?? dto.shippingAddress?.fullName,
            phone: dto.customer?.phone ?? dto.shippingAddress?.phone,
            email: dto.customer?.email,
            address: dto.shippingAddress?.addressLine1,
            city: dto.shippingAddress?.city,
            state: dto.shippingAddress?.state,
            postalCode: dto.shippingAddress?.postalCode,
          },
          undefined,
          tx,
        );
        let discountType: 'NONE' | 'FIXED' | 'PERCENTAGE' = 'NONE';
        let discountValue = money(0);
        if (cart.promoCode) {
          const merchandise = cart.items.reduce(
            (sum, item) => sum.add(money(item.productVariant.sellingPrice.toString()).mul(item.quantity)),
            money(0),
          );
          const resolved = assertPromoApplicable(cart.promoCode, merchandise);
          discountType = resolved.discountType;
          discountValue = resolved.discountValue;
          await this.promoCodes.consume(tx, tenantId, cart.promoCode.id);
        }
        const order = await this.engine.createOrder(
          {
            tenantId,
            source: 'WEBSITE',
            customerId: customer.id,
            fulfillmentMethod: dto.fulfillmentMethod ?? 'DELIVERY',
            notes: dto.notes,
            discountType,
            discountValue,
            promoCodeId: cart.promoCodeId,
            shippingAddress: dto.shippingAddress,
            items: cart.items.map((item) => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
            })),
            meta,
          },
          tx,
        );
        await this.carts.markConverted(tx, tenantId, cart.id, order.id);
        if (idempotencyKey) {
          await asTx(tx).checkoutIdempotency.update({
            where: { tenantId_keyHash: { tenantId, keyHash: hashOpaqueToken(idempotencyKey) } },
            data: { orderId: order.id },
          });
        }
        const access = this.tokens.signCustomerAccessToken({ customerId: customer.id, tenantId });
        return {
          order: toOrderDetail(order),
          cart: { id: cart.publicId, status: 'CONVERTED' as const },
          customerAccessToken: access.token,
        };
      }, TX_OPTIONS);
    } finally {
      try {
        await this.redis.getClient().del(lockKey);
      } catch {
        // Lock expires on its own if Redis is unavailable.
      }
    }
  }

  async createStaffOrder(actor: AuthPrincipal, dto: StaffCreateOrderDto, meta?: RequestMeta) {
    if (!dto.items?.length) {
      throw new BadRequestException('An order must contain at least one item.');
    }
    const discountType = dto.discountType ?? 'NONE';
    const discountValue =
      dto.discountValue == null || dto.discountValue === '' ? money(0) : parseMoney(dto.discountValue, 'discountValue');
    if (discountType !== 'NONE' && discountValue.gt(0) && !actor.permissions.includes('sales.discount')) {
      throw new ForbiddenException('You do not have permission to apply order discounts.');
    }
    return this.prisma.$transaction(async (tx) => {
      const customer = await this.customers.resolveForOrder(
        actor.tenantId,
        {
          customerId: dto.customerId,
          name: dto.customer?.name ?? dto.shippingAddress?.fullName,
          phone: dto.customer?.phone ?? dto.shippingAddress?.phone,
          email: dto.customer?.email,
          address: dto.shippingAddress?.addressLine1,
          city: dto.shippingAddress?.city,
          state: dto.shippingAddress?.state,
          postalCode: dto.shippingAddress?.postalCode,
        },
        actor,
        tx,
      );
      const order = await this.engine.createOrder(
        {
          tenantId: actor.tenantId,
          source: dto.source,
          customerId: customer.id,
          createdById: actor.userId,
          fulfillmentMethod: dto.fulfillmentMethod ?? 'DELIVERY',
          notes: dto.notes,
          discountType,
          discountValue,
          shippingAddress: dto.shippingAddress,
          items: dto.items,
          actor: { userId: actor.userId, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent },
          meta,
        },
        tx,
      );
      return toOrderDetail(order);
    }, TX_OPTIONS);
  }

  private fingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private async findReplay(tenantId: string, key: string, fingerprint: string) {
    const existing = await this.prisma.checkoutIdempotency.findFirst({
      where: { tenantId, keyHash: hashOpaqueToken(key) },
    });
    if (!existing) {
      return null;
    }
    if (existing.requestFingerprint !== fingerprint) {
      throw new ConflictException('Idempotency key was already used with a different checkout payload.');
    }
    if (!existing.orderId) {
      throw new ConflictException('Checkout is already in progress for this request.');
    }
    const order = await this.prisma.order.findFirst({
      where: { id: existing.orderId, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        items: { orderBy: { id: 'asc' as const } },
        payments: { orderBy: { createdAt: 'asc' as const } },
        shippingAddress: true,
      },
    });
    if (!order || !order.customerId) {
      return null;
    }
    const access = this.tokens.signCustomerAccessToken({ customerId: order.customerId, tenantId });
    return {
      order: toOrderDetail(order),
      cart: { id: existing.cartId ?? order.id, status: 'CONVERTED' as const },
      customerAccessToken: access.token,
    };
  }

  private async claimIdempotency(
    tx: object,
    tenantId: string,
    key: string,
    fingerprint: string,
    cartId: string,
  ) {
    const client = asTx(tx);
    try {
      await client.checkoutIdempotency.create({
        data: {
          tenantId,
          keyHash: hashOpaqueToken(key),
          requestFingerprint: fingerprint,
          cartId,
        },
      });
    } catch {
      const existing = await client.checkoutIdempotency.findFirst({
        where: { tenantId, keyHash: hashOpaqueToken(key) },
      });
      if (existing?.requestFingerprint !== fingerprint) {
        throw new ConflictException('Idempotency key was already used with a different checkout payload.');
      }
      if (existing?.orderId) {
        throw new ConflictException('This checkout request was already completed.');
      }
      throw new ConflictException('Checkout is already in progress for this request.');
    }
  }
}
