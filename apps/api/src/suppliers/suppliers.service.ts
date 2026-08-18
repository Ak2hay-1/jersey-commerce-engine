import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SupplierStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { normalizeOptionalText } from '../catalog/unique';
import { toSupplierDto } from './supplier.mapper';
import type { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier-mutations.dto';
import type { SupplierQueryDto } from './dto/supplier-query.dto';
import { money, moneyString, PAYABLE_PURCHASE_STATUSES } from '../purchases/purchase-money';
import { PaymentStatus } from '../prisma/client';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(tenantId: string, query: SupplierQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = this.listWhere(tenantId, query);
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: this.listOrder(query.sort),
        skip,
        take,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return {
      items: records.map(toSupplierDto),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async findById(tenantId: string, id: string) {
    const record = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    return toSupplierDto(assertFound(record, 'Supplier not found'));
  }

  async create(tenantId: string, dto: CreateSupplierDto, actor: AuthPrincipal) {
    const created = await this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        contactPerson: normalizeOptionalText(dto.contactPerson),
        phone: normalizeOptionalText(dto.phone),
        email: normalizeOptionalText(dto.email)?.toLowerCase() ?? null,
        address: normalizeOptionalText(dto.address),
        city: normalizeOptionalText(dto.city),
        state: normalizeOptionalText(dto.state),
        postalCode: normalizeOptionalText(dto.postalCode),
        taxInformation: normalizeOptionalText(dto.taxInformation),
        notes: normalizeOptionalText(dto.notes),
        status: dto.status ?? SupplierStatus.ACTIVE,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.SUPPLIER_CREATED,
      tenantId,
      userId: actor.userId,
      entity: 'Supplier',
      entityId: created.id,
      newValue: { name: created.name, status: created.status },
    });
    return toSupplierDto(created);
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto, actor: AuthPrincipal) {
    const existing = assertFound(
      await this.prisma.supplier.findFirst({ where: { id, tenantId } }),
      'Supplier not found',
    );
    const updated = await this.prisma.supplier.update({
      where: { id: existing.id },
      data: {
        name: dto.name === undefined ? existing.name : dto.name.trim(),
        contactPerson: dto.contactPerson === undefined ? existing.contactPerson : normalizeOptionalText(dto.contactPerson),
        phone: dto.phone === undefined ? existing.phone : normalizeOptionalText(dto.phone),
        email: dto.email === undefined ? existing.email : normalizeOptionalText(dto.email)?.toLowerCase() ?? null,
        address: dto.address === undefined ? existing.address : normalizeOptionalText(dto.address),
        city: dto.city === undefined ? existing.city : normalizeOptionalText(dto.city),
        state: dto.state === undefined ? existing.state : normalizeOptionalText(dto.state),
        postalCode: dto.postalCode === undefined ? existing.postalCode : normalizeOptionalText(dto.postalCode),
        taxInformation:
          dto.taxInformation === undefined ? existing.taxInformation : normalizeOptionalText(dto.taxInformation),
        notes: dto.notes === undefined ? existing.notes : normalizeOptionalText(dto.notes),
        status: dto.status ?? existing.status,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.SUPPLIER_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'Supplier',
      entityId: updated.id,
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
    });
    return toSupplierDto(updated);
  }

  async remove(tenantId: string, id: string, actor: AuthPrincipal) {
    const existing = assertFound(
      await this.prisma.supplier.findFirst({ where: { id, tenantId } }),
      'Supplier not found',
    );
    const purchaseCount = await this.prisma.purchase.count({ where: { tenantId, supplierId: id } });
    if (purchaseCount > 0) {
      const updated = await this.prisma.supplier.update({
        where: { id: existing.id },
        data: { status: SupplierStatus.INACTIVE },
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.SUPPLIER_DEACTIVATED,
        tenantId,
        userId: actor.userId,
        entity: 'Supplier',
        entityId: updated.id,
        oldValue: { status: existing.status },
        newValue: { status: updated.status, reason: 'Has historical purchase records' },
      });
      return { ...toSupplierDto(updated), archived: true };
    }
    await this.prisma.supplier.delete({ where: { id: existing.id } });
    await this.audit.log({
      action: AUDIT_ACTIONS.SUPPLIER_DELETED,
      tenantId,
      userId: actor.userId,
      entity: 'Supplier',
      entityId: existing.id,
      oldValue: { name: existing.name, status: existing.status },
    });
    return { id: existing.id, deleted: true };
  }

  async balance(tenantId: string, id: string) {
    const supplier = assertFound(
      await this.prisma.supplier.findFirst({ where: { id, tenantId } }),
      'Supplier not found',
    );
    const [purchases, payments] = await this.prisma.$transaction([
      this.prisma.purchase.aggregate({
        where: { tenantId, supplierId: id, status: { in: PAYABLE_PURCHASE_STATUSES } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.supplierPayment.aggregate({
        where: { tenantId, supplierId: id, status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);
    const totalPurchases = money(purchases._sum.total?.toString() ?? '0');
    const totalPaid = money(payments._sum.amount?.toString() ?? '0');
    return {
      supplierId: supplier.id,
      name: supplier.name,
      purchaseCount: purchases._count._all,
      totalPurchases: moneyString(totalPurchases),
      totalPaid: moneyString(totalPaid),
      outstandingAmount: moneyString(totalPurchases.sub(totalPaid)),
    };
  }

  async requireUsable(tenantId: string, id: string, db: object = this.prisma) {
    const supplier = await asTx(db).supplier.findFirst({ where: { id, tenantId } });
    const found = assertFound(supplier, 'Supplier not found');
    if (found.status === SupplierStatus.BLOCKED) {
      throw new BadRequestException('This supplier is blocked and cannot be used on new purchases.');
    }
    if (found.status === SupplierStatus.INACTIVE) {
      throw new BadRequestException('This supplier is inactive and cannot be used on new purchases.');
    }
    return found;
  }

  private listWhere(tenantId: string, query: SupplierQueryDto): Prisma.SupplierWhereInput {
    const search = query.search?.trim();
    return {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private listOrder(sort?: SupplierQueryDto['sort']): Prisma.SupplierOrderByWithRelationInput[] {
    switch (sort) {
      case 'createdAt':
        return [{ createdAt: 'desc' }];
      case 'updatedAt':
        return [{ updatedAt: 'desc' }];
      default:
        return [{ name: 'asc' }];
    }
  }
}
