import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CatalogStatus, VariantStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { asTx } from '../prisma/as-tx';
import { InventoryService } from '../inventory/inventory.service';
import { createOpaqueToken, hashOpaqueToken } from '../common/crypto/token-hash';
import { money } from '../pos/pos-money';
import { cartInclude, toCartDto, type CartRecord } from './store-cart.mapper';
import type { AddStoreCartItemDto, UpdateStoreCartItemDto } from '../orders/dto/order.dto';

const CART_TTL_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class StoreCartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  async create(tenantId: string, token?: string) {
    if (token) {
      const existing = await this.findActiveByToken(tenantId, token);
      if (existing) {
        return toCartDto(existing, { currency: await this.currency(tenantId) });
      }
    }
    const cartToken = createOpaqueToken('cart_');
    const cart = await this.prisma.cart.create({
      data: {
        tenantId,
        publicId: randomUUID(),
        tokenHash: hashOpaqueToken(cartToken),
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + CART_TTL_MS),
      },
      include: cartInclude,
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.CART_CREATED,
      tenantId,
      entity: 'Cart',
      entityId: cart.id,
      metadata: { publicId: cart.publicId },
    });
    return toCartDto(cart, { cartToken, currency: await this.currency(tenantId) });
  }

  async get(tenantId: string, token?: string) {
    const cart = await this.requireActiveCart(tenantId, token);
    return toCartDto(cart, { currency: await this.currency(tenantId) });
  }

  async addItem(tenantId: string, token: string | undefined, dto: AddStoreCartItemDto) {
    const cart = await this.requireActiveCart(tenantId, token);
    const quantity = dto.quantity ?? 1;
    const variant = await this.requireSellableVariant(tenantId, dto.productVariantId);
    const existing = cart.items.find((item) => item.productVariantId === variant.id);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    await this.assertAvailable(tenantId, variant.id, nextQuantity);
    const unitPrice = money(variant.sellingPrice.toString());
    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity, unitPrice },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          tenantId,
          publicId: randomUUID(),
          cartId: cart.id,
          productVariantId: variant.id,
          quantity: nextQuantity,
          unitPrice,
        },
      });
    }
    return this.reload(tenantId, cart.id);
  }

  async updateItem(tenantId: string, token: string | undefined, itemPublicId: string, dto: UpdateStoreCartItemDto) {
    const cart = await this.requireActiveCart(tenantId, token);
    const item = cart.items.find((row) => row.publicId === itemPublicId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
      return this.reload(tenantId, cart.id);
    }
    await this.requireSellableVariant(tenantId, item.productVariantId);
    await this.assertAvailable(tenantId, item.productVariantId, dto.quantity);
    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
    });
    return this.reload(tenantId, cart.id);
  }

  async removeItem(tenantId: string, token: string | undefined, itemPublicId: string) {
    const cart = await this.requireActiveCart(tenantId, token);
    const item = cart.items.find((row) => row.publicId === itemPublicId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.reload(tenantId, cart.id);
  }

  async clear(tenantId: string, token: string | undefined) {
    const cart = await this.requireActiveCart(tenantId, token);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, tenantId } });
    return this.reload(tenantId, cart.id);
  }

  async requireActiveCart(tenantId: string, token?: string): Promise<CartRecord> {
    if (!token) {
      throw new BadRequestException('Cart token is required.');
    }
    const cart = await this.findActiveByToken(tenantId, token);
    if (!cart) {
      throw new NotFoundException('Cart not found or has expired.');
    }
    return cart;
  }

  async markConverted(tx: object, tenantId: string, cartId: string, orderId: string) {
    await asTx(tx).cart.update({
      where: { id: cartId },
      data: { status: 'CONVERTED', convertedOrderId: orderId },
    });
    void tenantId;
  }

  private async findActiveByToken(tenantId: string, token: string): Promise<CartRecord | null> {
    const cart = await this.prisma.cart.findFirst({
      where: { tenantId, tokenHash: hashOpaqueToken(token) },
      include: cartInclude,
    });
    if (!cart) {
      return null;
    }
    if (cart.status === 'EXPIRED' || cart.expiresAt.getTime() <= Date.now()) {
      if (cart.status === 'ACTIVE') {
        await this.prisma.cart.update({ where: { id: cart.id }, data: { status: 'EXPIRED' } });
      }
      return null;
    }
    if (cart.status !== 'ACTIVE') {
      return null;
    }
    return cart;
  }

  private async refreshPrices(cart: CartRecord): Promise<CartRecord> {
    return cart;
  }

  private async reload(tenantId: string, cartId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, tenantId },
      include: cartInclude,
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return toCartDto(cart, { currency: await this.currency(tenantId) });
  }

  private async requireSellableVariant(tenantId: string, productVariantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: productVariantId, tenantId },
      include: { product: true },
    });
    if (!variant || variant.product.tenantId !== tenantId) {
      throw new NotFoundException('Product variant not found');
    }
    if (variant.product.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Product is not active.');
    }
    if (variant.status !== VariantStatus.ACTIVE) {
      throw new BadRequestException('Product variant is not active.');
    }
    if (money(variant.sellingPrice.toString()).lte(0)) {
      throw new BadRequestException('Item is not purchasable.');
    }
    return variant;
  }

  private async assertAvailable(tenantId: string, productVariantId: string, quantity: number) {
    const availability = await this.inventory.getAvailability(tenantId, productVariantId);
    if (availability.availableQuantity < quantity) {
      throw new ConflictException('Insufficient stock for this variant.');
    }
  }

  private async currency(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId }, select: { currency: true } });
    return tenant?.currency ?? 'INR';
  }
}
