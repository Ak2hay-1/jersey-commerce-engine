import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { slugify } from '@jersey-commerce/utils';
import type { PossibleCustomerMatch } from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { normalizeOptionalText } from '../catalog/unique';
import { computePurchaseMetrics, moneyNumber } from './customer-metrics';
import { CustomerInsightsService } from './customer-insights.service';
import { normalizeEmail, normalizePhone, phoneSearchDigits } from './customer-phone';
import { resolveCrmSettings } from './crm-settings';
import { segmentsFor } from './customer-segment';
import { toCustomerProfile, toCustomerSummary, toNoteDto, toTagDto } from './customer.mapper';
import type { CreateCustomerDto, UpdateCustomerDto } from './dto/customer-mutations.dto';
import type { CustomerHistoryQueryDto, CustomerQueryDto, CustomerReportQueryDto } from './dto/customer-query.dto';

const customerInclude = {
  preference: true,
  tags: { include: { tag: true }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.CustomerInclude;

export type CreateCustomerInput = CreateCustomerDto;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly insights: CustomerInsightsService,
  ) {}

  async findAll(tenantId: string, query: CustomerQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = this.listWhere(tenantId, query);
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return {
      items: records.map(toCustomerSummary),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async searchForPos(tenantId: string, query: CustomerQueryDto) {
    const { take } = toPaginationArgs({ ...query, pageSize: query.pageSize ?? query.limit ?? 10 });
    const where = this.listWhere(tenantId, query);
    const records = await this.prisma.customer.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      take,
      select: { id: true, name: true, phone: true, email: true, status: true, city: true, createdAt: true, updatedAt: true },
    });
    return { items: records.map(toCustomerSummary) };
  }

  async findById(tenantId: string, id: string) {
    const record = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    return assertFound(record, 'Customer not found');
  }

  async findAttachable(tenantId: string, id: string) {
    const customer = await this.findById(tenantId, id);
    if (customer.status === 'BLOCKED') {
      throw new BadRequestException('This customer is blocked and cannot be attached to a sale.');
    }
    return customer;
  }

  async resolveForOrder(
    tenantId: string,
    input: {
      customerId?: string;
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    },
    actor?: AuthPrincipal,
    db: object = this.prisma,
  ) {
    const client = asTx(db);
    if (input.customerId) {
      const existing = await client.customer.findFirst({ where: { id: input.customerId, tenantId } });
      const customer = assertFound(existing, 'Customer not found');
      if (customer.status === 'BLOCKED') {
        throw new BadRequestException('This customer is blocked and cannot be attached to an order.');
      }
      return customer;
    }
    const phone = normalizePhone(input.phone);
    const email = normalizeEmail(input.email);
    const matches = await this.findPossibleDuplicates(tenantId, { phone, email }, db);
    if (matches.length > 0) {
      const preferred =
        matches.find((match) => match.matchedOn.includes('phone')) ??
        matches.find((match) => match.matchedOn.includes('email')) ??
        matches[0];
      if (!preferred) {
        throw new BadRequestException('Customer contact details are required.');
      }
      const existing = await client.customer.findFirst({ where: { id: preferred.id, tenantId } });
      const customer = assertFound(existing, 'Customer not found');
      if (customer.status === 'BLOCKED') {
        throw new BadRequestException('This customer is blocked and cannot be attached to an order.');
      }
      return customer;
    }
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Customer name is required.');
    }
    if (!phone && !email) {
      throw new BadRequestException('Provide a phone number or email so this order can be associated with a customer.');
    }
    const created = await this.create(
      tenantId,
      {
        name,
        phone: phone ?? undefined,
        email: email ?? undefined,
        address: input.address,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
      },
      actor,
      db,
    );
    const record = await client.customer.findFirst({ where: { id: created.id, tenantId } });
    return assertFound(record, 'Customer not found');
  }

  async getProfile(tenantId: string, id: string, query?: CustomerReportQueryDto) {
    const record = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: customerInclude,
    });
    const customer = assertFound(record, 'Customer not found');
    const settings = resolveCrmSettings({
      highValueThreshold: query?.highValueThreshold,
      inactiveDays: query?.inactiveDays,
    });
    const metrics = await this.insights.metricsForCustomer(tenantId, id);
    const { segments, primarySegment } = segmentsFor({
      completedPurchaseCount: metrics.totalOrders,
      totalSpent: moneyNumber(metrics.totalSpent),
      lastPurchaseAt: metrics.lastPurchaseAt ? new Date(metrics.lastPurchaseAt) : null,
      createdAt: customer.createdAt,
      settings,
    });
    return toCustomerProfile({
      ...customer,
      tags: customer.tags.map((row) => row.tag),
      metrics,
      segments,
      primarySegment,
    });
  }

  async create(tenantId: string, input: CreateCustomerInput, actor?: AuthPrincipal, db: object = this.prisma) {
    const phone = normalizePhone(input.phone);
    const email = normalizeEmail(input.email);
    if (!input.allowDuplicate) {
      await this.assertNoDuplicate(tenantId, { phone, email });
    }
    const created = await asTx(db).customer.create({
      data: {
        tenantId,
        name: input.name.trim(),
        phone,
        email,
        address: normalizeOptionalText(input.address),
        city: normalizeOptionalText(input.city),
        state: normalizeOptionalText(input.state),
        postalCode: normalizeOptionalText(input.postalCode),
        notes: normalizeOptionalText(input.notes),
        status: input.status ?? 'ACTIVE',
        preference: {
          create: {
            tenantId,
            emailOptIn: input.preference?.emailOptIn ?? false,
            smsOptIn: input.preference?.smsOptIn ?? false,
            whatsappOptIn: input.preference?.whatsappOptIn ?? false,
          },
        },
      },
      include: customerInclude,
    });
    await this.audit.log(
      {
        action: AUDIT_ACTIONS.CUSTOMER_CREATED,
        tenantId,
        userId: actor?.userId,
        entity: 'Customer',
        entityId: created.id,
        newValue: { name: created.name, status: created.status },
      },
      db,
    );
    const metrics = computePurchaseMetrics([]);
    const { segments, primarySegment } = segmentsFor({
      completedPurchaseCount: 0,
      totalSpent: 0,
      lastPurchaseAt: null,
      createdAt: created.createdAt,
    });
    return toCustomerProfile({
      ...created,
      tags: created.tags.map((row) => row.tag),
      metrics,
      segments,
      primarySegment,
    });
  }

  async update(tenantId: string, id: string, input: UpdateCustomerDto, actor: AuthPrincipal) {
    const existing = await this.findById(tenantId, id);
    const phone = input.phone === undefined ? existing.phone : normalizePhone(input.phone);
    const email = input.email === undefined ? existing.email : normalizeEmail(input.email);
    if (!input.allowDuplicate) {
      await this.assertNoDuplicate(tenantId, { phone, email, excludeId: id });
    }
    await this.prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: input.name === undefined ? existing.name : input.name.trim(),
        phone,
        email,
        address: input.address === undefined ? existing.address : normalizeOptionalText(input.address),
        city: input.city === undefined ? existing.city : normalizeOptionalText(input.city),
        state: input.state === undefined ? existing.state : normalizeOptionalText(input.state),
        postalCode: input.postalCode === undefined ? existing.postalCode : normalizeOptionalText(input.postalCode),
        notes: input.notes === undefined ? existing.notes : normalizeOptionalText(input.notes),
        status: input.status ?? existing.status,
        preference: input.preference
          ? {
              upsert: {
                create: {
                  tenantId,
                  emailOptIn: input.preference.emailOptIn ?? false,
                  smsOptIn: input.preference.smsOptIn ?? false,
                  whatsappOptIn: input.preference.whatsappOptIn ?? false,
                },
                update: {
                  emailOptIn: input.preference.emailOptIn,
                  smsOptIn: input.preference.smsOptIn,
                  whatsappOptIn: input.preference.whatsappOptIn,
                },
              },
            }
          : undefined,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'Customer',
      entityId: existing.id,
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: input.name?.trim() ?? existing.name, status: input.status ?? existing.status },
    });
    return this.getProfile(tenantId, existing.id);
  }

  async remove(tenantId: string, id: string, actor: AuthPrincipal) {
    const existing = await this.findById(tenantId, id);
    const [sales, orders, carts] = await Promise.all([
      this.prisma.sale.count({ where: { tenantId, customerId: id } }),
      this.prisma.order.count({ where: { tenantId, customerId: id } }),
      this.prisma.posCart.count({ where: { tenantId, customerId: id } }),
    ]);
    if (sales + orders + carts > 0) {
      await this.prisma.customer.update({
        where: { id: existing.id },
        data: { status: 'INACTIVE' },
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.CUSTOMER_DEACTIVATED,
        tenantId,
        userId: actor.userId,
        entity: 'Customer',
        entityId: existing.id,
        oldValue: { status: existing.status },
        newValue: { status: 'INACTIVE', reason: 'Has transaction history' },
      });
      return { ...toCustomerSummary({ ...existing, status: 'INACTIVE' }), archived: true, deleted: false };
    }
    await this.prisma.customer.delete({ where: { id: existing.id } });
    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_DELETED,
      tenantId,
      userId: actor.userId,
      entity: 'Customer',
      entityId: existing.id,
      oldValue: { name: existing.name },
    });
    return { id: existing.id, archived: false, deleted: true };
  }

  history(tenantId: string, id: string, query: CustomerHistoryQueryDto) {
    return this.withCustomer(tenantId, id, () => this.insights.history(tenantId, id, query));
  }

  async activity(tenantId: string, id: string, query: CustomerHistoryQueryDto) {
    const customer = await this.findById(tenantId, id);
    return this.insights.activity(tenantId, id, customer.createdAt, query);
  }

  async summary(tenantId: string, id: string, query?: CustomerReportQueryDto) {
    const profile = await this.getProfile(tenantId, id, query);
    return {
      customer: toCustomerSummary(await this.findById(tenantId, id)),
      metrics: profile.metrics,
      segments: profile.segments,
      primarySegment: profile.primarySegment,
    };
  }

  dashboard(tenantId: string, query: CustomerReportQueryDto) {
    return this.insights.dashboard(tenantId, query);
  }

  top(tenantId: string, query: CustomerReportQueryDto) {
    return this.insights.top(tenantId, query);
  }

  repeat(tenantId: string, query: CustomerReportQueryDto) {
    return this.insights.repeat(tenantId, query);
  }

  inactive(tenantId: string, query: CustomerReportQueryDto) {
    return this.insights.inactive(tenantId, query);
  }

  async addNote(tenantId: string, id: string, body: string, actor: AuthPrincipal) {
    await this.findById(tenantId, id);
    const note = await this.prisma.customerNote.create({
      data: {
        tenantId,
        customerId: id,
        body: body.trim(),
        createdBy: actor.userId,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_NOTE_ADDED,
      tenantId,
      userId: actor.userId,
      entity: 'CustomerNote',
      entityId: note.id,
      metadata: { customerId: id },
    });
    return toNoteDto(note);
  }

  async listNotes(tenantId: string, id: string, query: CustomerHistoryQueryDto) {
    await this.findById(tenantId, id);
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = { tenantId, customerId: id };
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.customerNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { author: { select: { id: true, name: true } } },
      }),
      this.prisma.customerNote.count({ where }),
    ]);
    return {
      items: records.map(toNoteDto),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async assignTag(tenantId: string, id: string, input: { tagId?: string; name?: string }, actor: AuthPrincipal) {
    await this.findById(tenantId, id);
    const tag = input.tagId
      ? assertFound(
          await this.prisma.tag.findFirst({ where: { id: input.tagId, tenantId } }),
          'Tag not found',
        )
      : await this.findOrCreateTag(tenantId, input.name);
    const existing = await this.prisma.customerTag.findFirst({
      where: { tenantId, customerId: id, tagId: tag.id },
      include: { tag: true },
    });
    if (existing) {
      return toTagDto(existing.tag);
    }
    const assigned = await this.prisma.customerTag.create({
      data: {
        tenantId,
        customerId: id,
        tagId: tag.id,
        createdBy: actor.userId,
      },
      include: { tag: true },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_TAG_ASSIGNED,
      tenantId,
      userId: actor.userId,
      entity: 'CustomerTag',
      entityId: assigned.id,
      metadata: { customerId: id, tag: tag.name },
    });
    return toTagDto(assigned.tag);
  }

  async removeTag(tenantId: string, id: string, tagId: string, actor: AuthPrincipal) {
    await this.findById(tenantId, id);
    const assignment = assertFound(
      await this.prisma.customerTag.findFirst({
        where: { tenantId, customerId: id, tagId },
        include: { tag: true },
      }),
      'Customer tag not found',
    );
    await this.prisma.customerTag.delete({ where: { id: assignment.id } });
    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_TAG_REMOVED,
      tenantId,
      userId: actor.userId,
      entity: 'CustomerTag',
      entityId: assignment.id,
      metadata: { customerId: id, tag: assignment.tag.name },
    });
    return { removed: true, tag: toTagDto(assignment.tag) };
  }

  async listTags(tenantId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    return { items: tags.map(toTagDto) };
  }

  private async findOrCreateTag(tenantId: string, name?: string) {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException('Provide tagId or name.');
    }
    const slug = slugify(trimmed);
    if (!slug) {
      throw new BadRequestException('Tag name must include letters or numbers.');
    }
    const existing = await this.prisma.tag.findFirst({ where: { tenantId, slug } });
    if (existing) {
      return existing;
    }
    return this.prisma.tag.create({
      data: { tenantId, name: trimmed, slug },
    });
  }

  private async assertNoDuplicate(
    tenantId: string,
    input: { phone: string | null; email: string | null; excludeId?: string },
  ) {
    const matches = await this.findPossibleDuplicates(tenantId, input);
    if (matches.length === 0) {
      return;
    }
    throw new ConflictException({
      code: 'CONFLICT',
      message: 'A possible duplicate customer already exists.',
      details: {
        possibleMatches: matches,
        hint: 'Review the matches or resubmit with allowDuplicate=true. Customers are never merged automatically.',
      },
    });
  }

  async findPossibleDuplicates(
    tenantId: string,
    input: { phone: string | null; email: string | null; excludeId?: string },
    db: object = this.prisma,
  ): Promise<PossibleCustomerMatch[]> {
    const filters: Prisma.CustomerWhereInput[] = [];
    if (input.phone) {
      filters.push({ phone: input.phone });
    }
    if (input.email) {
      filters.push({ email: input.email });
    }
    if (filters.length === 0) {
      return [];
    }
    const records = await asTx(db).customer.findMany({
      where: {
        tenantId,
        OR: filters,
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
    });
    return records.map((record) => ({
      id: record.id,
      name: record.name,
      phone: record.phone,
      email: record.email,
      status: record.status,
      matchedOn: [
        ...(input.phone && record.phone === input.phone ? (['phone'] as const) : []),
        ...(input.email && record.email === input.email ? (['email'] as const) : []),
      ],
    }));
  }

  private listWhere(tenantId: string, query: CustomerQueryDto): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = { tenantId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }
    const search = query.search?.trim();
    if (search) {
      const phone = phoneSearchDigits(search);
      const or: Prisma.CustomerWhereInput[] = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
      if (phone) {
        or.push({ phone: { contains: phone } });
      }
      where.OR = or;
    }
    return where;
  }

  private async withCustomer<T>(tenantId: string, id: string, fn: () => Promise<T>): Promise<T> {
    await this.findById(tenantId, id);
    return fn();
  }
}
