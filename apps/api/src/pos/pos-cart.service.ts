import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, Prisma, VariantStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { assertFound } from '../common/http/assert-found';
import { parseMoney } from '../catalog/money';
import type { DiscountType } from '@jersey-commerce/types';
import {
  applyDiscount,
  assertDiscountPermission,
  canViewAllPosData,
  lineGross,
  money,
  normalizeDiscount,
} from './pos-money';
import { cartTotals, toCartDto } from './pos.mapper';
import { PosSessionService } from './pos-session.service';
import type {
  AddPosCartItemDto,
  CreatePosCartDto,
  PosCartCustomerDto,
  UpdatePosCartDto,
  UpdatePosCartItemDto,
} from './dto/cart.dto';

export const posCartInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  items: {
    include: {
      productVariant: {
        include: {
          inventory: true,
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }] },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.PosCartInclude;

@Injectable()
export class PosCartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessions: PosSessionService,
    private readonly customers: CustomersService,
    private readonly inventory: InventoryService,
  ) {}

  async create(actor: AuthPrincipal, dto: CreatePosCartDto) {
    const session = await this.sessions.requireOpenForUser(actor.tenantId, actor.userId);
    const existing = await this.prisma.posCart.findFirst({
      where: { tenantId: actor.tenantId, posSessionId: session.id, status: 'ACTIVE' },
      include: posCartInclude,
    });
    if (existing) {
      return toCartDto(existing);
    }
    const customerId = await this.resolveCustomer(actor, dto, true);
    const discount = this.parseDiscount(actor, dto.discountType, dto.discountValue);
    const cart = await this.prisma.posCart.create({
      data: {
        tenantId: actor.tenantId,
        posSessionId: session.id,
        userId: actor.userId,
        customerId,
        discountType: discount.type,
        discountValue: discount.value,
        notes: dto.notes?.trim() || null,
      },
      include: posCartInclude,
    });
    if (discount.type !== 'NONE') {
      await this.auditDiscount(actor, cart.id, 'CART', discount);
    }
    return toCartDto(cart);
  }

  async current(actor: AuthPrincipal) {
    const session = await this.sessions.requireOpenForUser(actor.tenantId, actor.userId);
    const cart = await this.prisma.posCart.findFirst({
      where: { tenantId: actor.tenantId, posSessionId: session.id, status: 'ACTIVE' },
      include: posCartInclude,
    });
    return toCartDto(assertFound(cart, 'No active cart'));
  }

  async update(actor: AuthPrincipal, dto: UpdatePosCartDto) {
    const cart = await this.requireMutableCart(actor);
    const customerId =
      dto.walkIn || dto.customerId || dto.newCustomer
        ? await this.resolveCustomer(actor, dto, false)
        : cart.customerId;
    const discount =
      dto.discountType === undefined && dto.discountValue === undefined
        ? { type: cart.discountType, value: money(cart.discountValue.toString()) }
        : this.parseDiscount(
            actor,
            dto.discountType ?? cart.discountType,
            dto.discountValue ?? cart.discountValue.toString(),
          );
    this.assertCartDiscountFits(cart.items, discount.type, discount.value);
    const updated = await this.prisma.posCart.update({
      where: { id: cart.id },
      data: {
        customerId,
        discountType: discount.type,
        discountValue: discount.value,
        notes: dto.notes === undefined ? cart.notes : dto.notes.trim() || null,
      },
      include: posCartInclude,
    });
    if (discount.type !== 'NONE' && !discount.value.eq(cart.discountValue)) {
      await this.auditDiscount(actor, cart.id, 'CART', discount);
    }
    return toCartDto(updated);
  }

  async addItem(actor: AuthPrincipal, dto: AddPosCartItemDto) {
    const cart = await this.requireMutableCart(actor);
    const quantity = dto.quantity ?? 1;
    this.assertPositiveQuantity(quantity);
    const variant = await this.requireSellableVariant(actor.tenantId, dto.productVariantId);
    const discount = this.parseDiscount(actor, dto.discountType, dto.discountValue);
    const existing = cart.items.find((item) => item.productVariantId === variant.id);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    await this.assertAvailable(actor.tenantId, variant.id, nextQuantity);
    const unitPrice = money(variant.sellingPrice.toString());
    const line = this.lineValues(unitPrice, nextQuantity, discount.type, discount.value);
    const saved = existing
      ? await this.prisma.posCartItem.update({
          where: { id: existing.id },
          data: {
            quantity: nextQuantity,
            unitPrice,
            discountType: existing ? existing.discountType : discount.type,
            discountValue: existing ? existing.discountValue : discount.value,
            lineTotal: existing
              ? this.lineValues(
                  unitPrice,
                  nextQuantity,
                  existing.discountType,
                  money(existing.discountValue.toString()),
                ).lineTotal
              : line.lineTotal,
          },
        })
      : await this.prisma.posCartItem.create({
          data: {
            tenantId: actor.tenantId,
            cartId: cart.id,
            productVariantId: variant.id,
            quantity,
            unitPrice,
            discountType: discount.type,
            discountValue: discount.value,
            lineTotal: line.lineTotal,
          },
        });
    if (!existing && discount.type !== 'NONE') {
      await this.auditDiscount(actor, saved.id, 'LINE', discount);
    }
    return this.reload(cart.id);
  }

  async updateItem(actor: AuthPrincipal, itemId: string, dto: UpdatePosCartItemDto) {
    const cart = await this.requireMutableCart(actor);
    const item = cart.items.find((row) => row.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    const quantity = dto.quantity ?? item.quantity;
    this.assertPositiveQuantity(quantity);
    await this.assertAvailable(actor.tenantId, item.productVariantId, quantity);
    const discount =
      dto.discountType === undefined && dto.discountValue === undefined
        ? { type: item.discountType, value: money(item.discountValue.toString()) }
        : this.parseDiscount(
            actor,
            dto.discountType ?? item.discountType,
            dto.discountValue ?? item.discountValue.toString(),
          );
    const unitPrice = money(item.unitPrice.toString());
    const line = this.lineValues(unitPrice, quantity, discount.type, discount.value);
    await this.prisma.posCartItem.update({
      where: { id: item.id },
      data: {
        quantity,
        unitPrice,
        discountType: discount.type,
        discountValue: discount.value,
        lineTotal: line.lineTotal,
      },
    });
    if (discount.type !== 'NONE' && !discount.value.eq(item.discountValue)) {
      await this.auditDiscount(actor, item.id, 'LINE', discount);
    }
    return this.reload(cart.id);
  }

  async removeItem(actor: AuthPrincipal, itemId: string) {
    const cart = await this.requireMutableCart(actor);
    const item = cart.items.find((row) => row.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.posCartItem.delete({ where: { id: item.id } });
    return this.reload(cart.id);
  }

  async clear(actor: AuthPrincipal) {
    const cart = await this.requireMutableCart(actor);
    await this.prisma.$transaction([
      this.prisma.posCartItem.deleteMany({ where: { tenantId: actor.tenantId, cartId: cart.id } }),
      this.prisma.posCart.update({
        where: { id: cart.id },
        data: { discountType: 'NONE', discountValue: 0 },
      }),
    ]);
    return this.reload(cart.id);
  }

  async hold(actor: AuthPrincipal, cartId: string) {
    const cart = await this.requireOwnedCart(actor, cartId);
    if (cart.status !== 'ACTIVE') {
      throw new ConflictException('Only the active cart can be placed on hold.');
    }
    if (cart.items.length === 0) {
      throw new BadRequestException('An empty cart cannot be held.');
    }
    const held = await this.prisma.posCart.update({
      where: { id: cart.id },
      data: { status: 'HELD', heldAt: new Date() },
      include: posCartInclude,
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.POS_CART_HELD,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'PosCart',
      entityId: cart.id,
      metadata: { posSessionId: cart.posSessionId, itemCount: cart.items.length },
    });
    return toCartDto(held);
  }

  async resume(actor: AuthPrincipal, cartId: string) {
    const cart = await this.requireOwnedCart(actor, cartId);
    if (cart.status !== 'HELD') {
      throw new ConflictException('Only a held cart can be resumed.');
    }
    const session = await this.sessions.requireOpenForUser(actor.tenantId, actor.userId);
    if (cart.posSessionId !== session.id) {
      throw new ForbiddenException('Held carts can only be resumed in the same POS session.');
    }
    const resumed = await this.prisma.$transaction(async (raw) => {
      const tx = asTx(raw);
      await tx.posCart.updateMany({
        where: {
          tenantId: actor.tenantId,
          posSessionId: session.id,
          status: 'ACTIVE',
          id: { not: cart.id },
        },
        data: { status: 'HELD', heldAt: new Date() },
      });
      return tx.posCart.update({
        where: { id: cart.id },
        data: { status: 'ACTIVE', heldAt: null },
        include: posCartInclude,
      });
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.POS_CART_RESUMED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'PosCart',
      entityId: cart.id,
      metadata: { posSessionId: cart.posSessionId },
    });
    return toCartDto(resumed);
  }

  async held(actor: AuthPrincipal) {
    const where: Prisma.PosCartWhereInput = {
      tenantId: actor.tenantId,
      status: 'HELD',
      ...(canViewAllPosData(actor) ? {} : { userId: actor.userId }),
    };
    const carts = await this.prisma.posCart.findMany({
      where,
      include: posCartInclude,
      orderBy: { heldAt: 'desc' },
    });
    return { items: carts.map(toCartDto) };
  }

  async loadForSale(tenantId: string, cartId: string, db: object = this.prisma) {
    return asTx(db).posCart.findFirst({
      where: { id: cartId, tenantId },
      include: posCartInclude,
    });
  }

  async lock(tx: object, tenantId: string, cartId: string) {
    const client = asTx(tx);
    const rows = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM pos_carts
      WHERE id = ${cartId} AND tenant_id = ${tenantId}
      FOR UPDATE
    `;
    if (!rows[0]) {
      throw new BadRequestException('Cart not found.');
    }
    return client.posCart.findFirstOrThrow({
      where: { id: cartId, tenantId },
      include: posCartInclude,
    });
  }

  private async reload(cartId: string) {
    const cart = await this.prisma.posCart.findFirst({
      where: { id: cartId },
      include: posCartInclude,
    });
    return toCartDto(assertFound(cart, 'Cart not found'));
  }

  private async requireMutableCart(actor: AuthPrincipal) {
    const session = await this.sessions.requireOpenForUser(actor.tenantId, actor.userId);
    const cart = await this.prisma.posCart.findFirst({
      where: { tenantId: actor.tenantId, posSessionId: session.id, userId: actor.userId, status: 'ACTIVE' },
      include: posCartInclude,
    });
    return assertFound(cart, 'No active cart');
  }

  private async requireOwnedCart(actor: AuthPrincipal, cartId: string) {
    const cart = await this.prisma.posCart.findFirst({
      where: { id: cartId, tenantId: actor.tenantId },
      include: posCartInclude,
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    if (!canViewAllPosData(actor) && cart.userId !== actor.userId) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  private async requireSellableVariant(tenantId: string, productVariantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: productVariantId, tenantId },
      include: { product: true, inventory: true },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    if (variant.product.tenantId !== tenantId) {
      throw new NotFoundException('Product variant not found');
    }
    if (variant.product.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Product is not active.');
    }
    if (variant.status !== VariantStatus.ACTIVE) {
      throw new BadRequestException('Product variant is not active.');
    }
    const price = money(variant.sellingPrice.toString());
    if (price.lte(0)) {
      throw new BadRequestException('Selling price is not valid.');
    }
    return variant;
  }

  private async assertAvailable(tenantId: string, productVariantId: string, quantity: number) {
    const availability = await this.inventory.getAvailability(tenantId, productVariantId);
    if (availability.availableQuantity < quantity) {
      throw new ConflictException('Insufficient stock for this variant.');
    }
  }

  private async resolveCustomer(actor: AuthPrincipal, dto: PosCartCustomerDto, creating: boolean) {
    if (dto.walkIn) {
      return null;
    }
    if (dto.newCustomer) {
      if (!actor.permissions.includes('customers.create')) {
        throw new ForbiddenException('You do not have permission to create customers.');
      }
      const created = await this.customers.create(actor.tenantId, dto.newCustomer, actor);
      return created.id;
    }
    if (dto.customerId) {
      const customer = await this.customers.findAttachable(actor.tenantId, dto.customerId);
      return customer.id;
    }
    return creating ? null : undefined;
  }

  private parseDiscount(actor: AuthPrincipal, type?: DiscountType, raw?: string) {
    const parsed = normalizeDiscount(type, raw ? parseMoney(raw, 'discountValue') : 0);
    assertDiscountPermission(actor, parsed.type, parsed.value);
    return parsed;
  }

  private assertCartDiscountFits(
    items: Array<{
      quantity: number;
      unitPrice: Prisma.Decimal;
      discountType: DiscountType;
      discountValue: Prisma.Decimal;
    }>,
    type: DiscountType,
    value: Prisma.Decimal,
  ) {
    cartTotals(
      items.map((item) => ({
        quantity: item.quantity,
        unitPrice: money(item.unitPrice.toString()),
        discountType: item.discountType,
        discountValue: money(item.discountValue.toString()),
      })),
      type,
      value,
    );
  }

  private lineValues(unitPrice: Prisma.Decimal, quantity: number, type: DiscountType, value: Prisma.Decimal) {
    const line = applyDiscount(lineGross(unitPrice, quantity), type, value);
    return { lineTotal: line.net, discountAmount: line.discountAmount };
  }

  private assertPositiveQuantity(quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer.');
    }
  }

  private async auditDiscount(
    actor: AuthPrincipal,
    entityId: string,
    scope: 'LINE' | 'CART',
    discount: { type: DiscountType; value: Prisma.Decimal },
  ) {
    await this.audit.log({
      action: AUDIT_ACTIONS.POS_DISCOUNT_APPLIED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: scope === 'LINE' ? 'PosCartItem' : 'PosCart',
      entityId,
      metadata: { scope, discountType: discount.type, discountValue: discount.value.toFixed(2) },
    });
  }
}
