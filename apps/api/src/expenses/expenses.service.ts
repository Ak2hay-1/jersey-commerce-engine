import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { ExpenseDto, ExpenseListResult } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import type { AuthPrincipal } from '../common/context/request-context';
import { parseNonNegativeMoney } from '../purchases/purchase-money';
import type { CreateExpenseDto, ExpenseQueryDto, UpdateExpenseDto, VoidExpenseDto } from './dto/expense.dto';
import type { RequestMeta } from '../auth/auth-session.service';

const expenseInclude = {
  category: true,
  creator: { select: { id: true, name: true } },
  voidedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findCategories(tenantId: string) {
    return this.prisma.expenseCategory.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async findAll(tenantId: string, query: ExpenseQueryDto): Promise<ExpenseListResult> {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where: Prisma.ExpenseWhereInput = {
      tenantId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.from || query.to
        ? {
            expenseDate: {
              ...(query.from ? { gte: this.parseDate(query.from, 'from') } : {}),
              ...(query.to ? { lte: this.parseDate(query.to, 'to') } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { reference: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: { expenseDate: 'desc' },
        skip,
        take,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { items: items.map((item) => this.toDto(item)), meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string): Promise<ExpenseDto> {
    return this.toDto(
      assertFound(
        await this.prisma.expense.findFirst({ where: { id, tenantId }, include: expenseInclude }),
        'Expense not found',
      ),
    );
  }

  async create(actor: AuthPrincipal, dto: CreateExpenseDto, meta?: RequestMeta): Promise<ExpenseDto> {
    await this.requireCategory(actor.tenantId, dto.categoryId);
    const amount = parseNonNegativeMoney(dto.amount, 'amount');
    if (amount.lte(0)) {
      throw new BadRequestException('amount must be greater than 0.');
    }
    const created = await this.prisma.expense.create({
      data: {
        tenantId: actor.tenantId,
        categoryId: dto.categoryId,
        amount,
        description: dto.description?.trim() || null,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference?.trim() || null,
        expenseDate: this.parseDate(dto.expenseDate, 'expenseDate'),
        createdBy: actor.userId,
        status: 'ACTIVE',
      },
      include: expenseInclude,
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.EXPENSE_CREATED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'Expense',
      entityId: created.id,
      newValue: { amount: created.amount.toFixed(2), categoryId: created.categoryId, expenseDate: created.expenseDate },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.toDto(created);
  }

  async update(actor: AuthPrincipal, id: string, dto: UpdateExpenseDto, meta?: RequestMeta): Promise<ExpenseDto> {
    const existing = assertFound(
      await this.prisma.expense.findFirst({ where: { id, tenantId: actor.tenantId }, include: expenseInclude }),
      'Expense not found',
    );
    if (existing.status === 'VOIDED') {
      throw new ConflictException('Voided expenses cannot be edited.');
    }
    if (dto.categoryId) {
      await this.requireCategory(actor.tenantId, dto.categoryId);
    }
    const updated = await this.prisma.expense.update({
      where: { id: existing.id },
      data: {
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.amount ? { amount: parseNonNegativeMoney(dto.amount, 'amount') } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.reference !== undefined ? { reference: dto.reference?.trim() || null } : {}),
        ...(dto.expenseDate ? { expenseDate: this.parseDate(dto.expenseDate, 'expenseDate') } : {}),
      },
      include: expenseInclude,
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.EXPENSE_UPDATED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'Expense',
      entityId: updated.id,
      oldValue: { amount: existing.amount.toFixed(2), categoryId: existing.categoryId },
      newValue: { amount: updated.amount.toFixed(2), categoryId: updated.categoryId },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.toDto(updated);
  }

  async void(actor: AuthPrincipal, id: string, dto: VoidExpenseDto, meta?: RequestMeta): Promise<ExpenseDto> {
    const existing = assertFound(
      await this.prisma.expense.findFirst({ where: { id, tenantId: actor.tenantId }, include: expenseInclude }),
      'Expense not found',
    );
    if (existing.status === 'VOIDED') {
      throw new ConflictException('Expense is already voided.');
    }
    const updated = await this.prisma.expense.update({
      where: { id: existing.id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedById: actor.userId,
        voidReason: (dto.reason ?? 'Voided from ERP').trim(),
      },
      include: expenseInclude,
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.EXPENSE_VOIDED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'Expense',
      entityId: updated.id,
      oldValue: { status: existing.status, amount: existing.amount.toFixed(2) },
      newValue: { status: 'VOIDED', reason: (dto.reason ?? 'Voided from ERP').trim() },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.toDto(updated);
  }

  private async requireCategory(tenantId: string, categoryId: string) {
    assertFound(
      await this.prisma.expenseCategory.findFirst({ where: { id: categoryId, tenantId } }),
      'Expense category not found',
    );
  }

  private parseDate(value: string, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date.`);
    }
    return parsed;
  }

  private toDto(record: {
    id: string;
    categoryId: string;
    amount: Prisma.Decimal;
    description: string | null;
    paymentMethod: ExpenseDto['paymentMethod'];
    reference: string | null;
    expenseDate: Date;
    status: ExpenseDto['status'];
    createdAt: Date;
    updatedAt: Date;
    voidedAt: Date | null;
    voidReason: string | null;
    category: { id: string; name: string; slug: string };
    creator: { id: string; name: string };
    voidedBy: { id: string; name: string } | null;
  }): ExpenseDto {
    return {
      id: record.id,
      categoryId: record.categoryId,
      category: { id: record.category.id, name: record.category.name, slug: record.category.slug },
      amount: record.amount.toFixed(2),
      description: record.description,
      paymentMethod: record.paymentMethod,
      reference: record.reference,
      expenseDate: record.expenseDate.toISOString().slice(0, 10),
      status: record.status,
      createdBy: record.creator,
      voidedAt: record.voidedAt?.toISOString() ?? null,
      voidedBy: record.voidedBy,
      voidReason: record.voidReason,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
