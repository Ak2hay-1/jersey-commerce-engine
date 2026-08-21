import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { PromoCodeDto, PromoCodeListResult } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import type { AuthPrincipal } from '../common/context/request-context';
import type { RequestMeta } from '../auth/auth-session.service';
import { moneyString, optionalMoney, parseMoney } from '../catalog/money';
import { asTx } from '../prisma/as-tx';
import { generatePromoCode, normalizePromoCode } from './promo-code.engine';
import type { CreatePromoCodeDto, PromoCodeQueryDto, UpdatePromoCodeDto } from './dto/promo-code.dto';

type PromoRecord = Prisma.PromoCodeGetPayload<object>;

@Injectable()
export class PromoCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(tenantId: string, query: PromoCodeQueryDto): Promise<PromoCodeListResult> {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const search = query.search?.trim();
    const where: Prisma.PromoCodeWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.promoCode.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.promoCode.count({ where }),
    ]);
    return { items: items.map((item) => this.toDto(item)), meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string): Promise<PromoCodeDto> {
    return this.toDto(assertFound(await this.prisma.promoCode.findFirst({ where: { id, tenantId } }), 'Promo code not found'));
  }

  async generate(prefix?: string): Promise<{ code: string }> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generatePromoCode(prefix);
      const existing = await this.prisma.promoCode.findFirst({ where: { code } });
      if (!existing) {
        return { code };
      }
    }
    return { code: generatePromoCode(prefix) };
  }

  async create(actor: AuthPrincipal, dto: CreatePromoCodeDto, meta?: RequestMeta): Promise<PromoCodeDto> {
    const code = normalizePromoCode(dto.code || (await this.generate()).code);
    this.assertDiscount(dto.discountType, dto.discountValue);
    try {
      const created = await this.prisma.promoCode.create({
        data: {
          tenantId: actor.tenantId,
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          discountType: dto.discountType,
          discountValue: parseMoney(dto.discountValue, 'discountValue'),
          minSubtotal: optionalMoney(dto.minSubtotal, 'minSubtotal'),
          maxDiscount: optionalMoney(dto.maxDiscount, 'maxDiscount'),
          usageLimit: dto.usageLimit ?? null,
          startsAt: this.parseDate(dto.startsAt, 'startsAt'),
          endsAt: this.parseDate(dto.endsAt, 'endsAt'),
          createdById: actor.userId,
        },
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.PROMO_CODE_CREATED,
        tenantId: actor.tenantId,
        userId: actor.userId,
        entity: 'PromoCode',
        entityId: created.id,
        metadata: { code: created.code },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      return this.toDto(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A promo code with this value already exists.');
      }
      throw error;
    }
  }

  async update(actor: AuthPrincipal, id: string, dto: UpdatePromoCodeDto, meta?: RequestMeta): Promise<PromoCodeDto> {
    const existing = assertFound(
      await this.prisma.promoCode.findFirst({ where: { id, tenantId: actor.tenantId } }),
      'Promo code not found',
    );
    const discountType = dto.discountType ?? existing.discountType;
    const discountValue = dto.discountValue ?? existing.discountValue.toFixed(2);
    if (discountType === 'NONE') {
      throw new BadRequestException('Promo codes must use a fixed or percentage discount.');
    }
    this.assertDiscount(discountType, discountValue);
    const updated = await this.prisma.promoCode.update({
      where: { id: existing.id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
        discountType: dto.discountType,
        discountValue: dto.discountValue === undefined ? undefined : parseMoney(dto.discountValue, 'discountValue'),
        minSubtotal: dto.minSubtotal === undefined ? undefined : optionalMoney(dto.minSubtotal, 'minSubtotal'),
        maxDiscount: dto.maxDiscount === undefined ? undefined : optionalMoney(dto.maxDiscount, 'maxDiscount'),
        usageLimit: dto.usageLimit === undefined ? undefined : dto.usageLimit,
        startsAt: dto.startsAt === undefined ? undefined : this.parseDate(dto.startsAt, 'startsAt'),
        endsAt: dto.endsAt === undefined ? undefined : this.parseDate(dto.endsAt, 'endsAt'),
        status: dto.status,
      },
    });
    await this.audit.log({
      action: dto.status === 'DISABLED' ? AUDIT_ACTIONS.PROMO_CODE_DISABLED : AUDIT_ACTIONS.PROMO_CODE_UPDATED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'PromoCode',
      entityId: updated.id,
      metadata: { code: updated.code, status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.toDto(updated);
  }

  async consume(tx: object, tenantId: string, promoCodeId: string): Promise<void> {
    const client = asTx(tx);
    const locked = await client.$queryRaw<Array<{ id: string; usage_limit: number | null; usage_count: number }>>`
      SELECT id, usage_limit, usage_count FROM promo_codes
      WHERE id = ${promoCodeId} AND tenant_id = ${tenantId}
      FOR UPDATE
    `;
    const row = locked[0];
    if (!row) {
      throw new BadRequestException('Promo code was not found.');
    }
    if (row.usage_limit != null && row.usage_count >= row.usage_limit) {
      throw new BadRequestException('This promo code has reached its usage limit.');
    }
    await client.promoCode.update({
      where: { id: promoCodeId },
      data: { usageCount: { increment: 1 } },
    });
  }

  toDto(record: PromoRecord): PromoCodeDto {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      discountType: record.discountType === 'NONE' ? 'FIXED' : record.discountType,
      discountValue: moneyString(record.discountValue) ?? '0.00',
      minSubtotal: record.minSubtotal ? moneyString(record.minSubtotal) : null,
      maxDiscount: record.maxDiscount ? moneyString(record.maxDiscount) : null,
      usageLimit: record.usageLimit,
      usageCount: record.usageCount,
      startsAt: record.startsAt?.toISOString() ?? null,
      endsAt: record.endsAt?.toISOString() ?? null,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private assertDiscount(type: string, value: string): void {
    const amount = parseMoney(value, 'discountValue');
    if (amount.lte(0)) {
      throw new BadRequestException('discountValue must be greater than 0.');
    }
    if (type === 'PERCENTAGE' && amount.gt(100)) {
      throw new BadRequestException('Percentage promo codes cannot exceed 100.');
    }
    if (type === 'NONE') {
      throw new BadRequestException('Promo codes must use a fixed or percentage discount.');
    }
  }

  private parseDate(value: string | null | undefined, field: string): Date | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} is not a valid date.`);
    }
    return parsed;
  }
}
