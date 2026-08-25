import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { slugify } from '@jersey-commerce/utils';
import type { CategoryDetail } from '@jersey-commerce/types';
import { CatalogStatus, Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { throwUniqueConflict, normalizeOptionalText } from '../catalog/unique';
import { toCategoryDetail } from '../catalog/catalog.mapper';
import type { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from './dto/category-mutations.dto';
import type { AuthPrincipal } from '../common/context/request-context';

const categoryInclude = {
  parent: true,
  children: { orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] },
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateCategoryDto, actor: AuthPrincipal): Promise<CategoryDetail> {
    const tenantId = this.tenantContext.currentTenantId;
    const parentId = await this.assertParent(tenantId, dto.parentId ?? null);
    await this.assertSiblingNameAvailable(tenantId, parentId, dto.name);
    const slug = await this.allocateSlug(tenantId, dto.slug ?? slugify(dto.name));
    try {
      const created = await this.prisma.category.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          slug,
          description: normalizeOptionalText(dto.description),
          image: normalizeOptionalText(dto.image),
          parentId,
          sortOrder: dto.sortOrder ?? 0,
          status: dto.status ?? CatalogStatus.ACTIVE,
        },
        include: categoryInclude,
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.CATEGORY_CREATED,
        tenantId,
        userId: actor.userId,
        entity: 'Category',
        entityId: created.id,
        metadata: { name: created.name, slug: created.slug },
      });
      return toCategoryDetail(created);
    } catch (error) {
      throwUniqueConflict(error);
      throw error;
    }
  }

  async findAll(query: CategoryQueryDto) {
    const tenantId = this.tenantContext.currentTenantId;
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where: Prisma.CategoryWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.search
        ? { name: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        include: categoryInclude,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      this.prisma.category.count({ where }),
    ]);
    return {
      items: items.map((item) => toCategoryDetail(item)),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async findById(id: string): Promise<CategoryDetail> {
    return toCategoryDetail(await this.requireCategory(id));
  }

  async update(id: string, dto: UpdateCategoryDto, actor: AuthPrincipal): Promise<CategoryDetail> {
    const tenantId = this.tenantContext.currentTenantId;
    const existing = await this.requireCategory(id);
    const parentId =
      dto.parentId === undefined ? existing.parentId : await this.assertParent(tenantId, dto.parentId, existing.id);
    if (dto.name && dto.name.trim() !== existing.name) {
      await this.assertSiblingNameAvailable(tenantId, parentId, dto.name, existing.id);
    }
    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = await this.allocateSlug(tenantId, dto.slug, existing.id);
    }
    try {
      const updated = await this.prisma.category.update({
        where: { id: existing.id },
        data: {
          name: dto.name?.trim(),
          slug,
          description: dto.description === undefined ? undefined : normalizeOptionalText(dto.description),
          image: dto.image === undefined ? undefined : normalizeOptionalText(dto.image),
          parentId,
          sortOrder: dto.sortOrder,
          status: dto.status,
        },
        include: categoryInclude,
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.CATEGORY_UPDATED,
        tenantId,
        userId: actor.userId,
        entity: 'Category',
        entityId: updated.id,
        metadata: { fields: Object.keys(dto) },
      });
      return toCategoryDetail(updated);
    } catch (error) {
      throwUniqueConflict(error);
      throw error;
    }
  }

  async remove(id: string, actor: AuthPrincipal) {
    const tenantId = this.tenantContext.currentTenantId;
    const existing = await this.requireCategory(id);
    const [productCount, childCount] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, categoryId: existing.id } }),
      this.prisma.category.count({ where: { tenantId, parentId: existing.id } }),
    ]);
    if (productCount > 0 || childCount > 0) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'This category still has products or child categories. Archive it or reassign them first.',
        details: { productCount, childCount, suggestion: 'ARCHIVE_OR_REASSIGN' },
      });
    }
    await this.prisma.category.delete({ where: { id: existing.id } });
    await this.audit.log({
      action: AUDIT_ACTIONS.CATEGORY_DELETED,
      tenantId,
      userId: actor.userId,
      entity: 'Category',
      entityId: existing.id,
      metadata: { name: existing.name },
    });
    return { id: existing.id, deleted: true };
  }

  async archive(id: string, actor: AuthPrincipal): Promise<CategoryDetail> {
    const updated = await this.update(id, { status: CatalogStatus.ARCHIVED }, actor);
    await this.audit.log({
      action: AUDIT_ACTIONS.CATEGORY_ARCHIVED,
      tenantId: this.tenantContext.currentTenantId,
      userId: actor.userId,
      entity: 'Category',
      entityId: updated.id,
    });
    return updated;
  }

  private async requireCategory(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId: this.tenantContext.currentTenantId },
      include: categoryInclude,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  private async assertParent(tenantId: string, parentId: string | null, selfId?: string): Promise<string | null> {
    if (!parentId) {
      return null;
    }
    if (selfId && parentId === selfId) {
      throw new BadRequestException('A category cannot be its own parent.');
    }
    const parent = await this.prisma.category.findFirst({ where: { id: parentId, tenantId } });
    if (!parent) {
      throw new BadRequestException('Parent category was not found in this store.');
    }
    if (selfId) {
      await this.assertNoCycle(tenantId, selfId, parentId);
    }
    return parent.id;
  }

  private async assertNoCycle(tenantId: string, categoryId: string, newParentId: string): Promise<void> {
    const seen = new Set<string>([categoryId]);
    let current: string | null = newParentId;
    for (let depth = 0; depth < 32; depth += 1) {
      if (!current) {
        return;
      }
      if (seen.has(current)) {
        throw new BadRequestException('A category cannot be moved under one of its descendants.');
      }
      seen.add(current);
      const node: { parentId: string | null } | null = await this.prisma.category.findFirst({
        where: { id: current, tenantId },
        select: { parentId: true },
      });
      current = node?.parentId ?? null;
    }
    throw new BadRequestException('Category hierarchy is too deep.');
  }

  private async assertSiblingNameAvailable(
    tenantId: string,
    parentId: string | null,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.category.findFirst({
      where: {
        tenantId,
        parentId,
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate) {
      throw new ConflictException('A category with this name already exists at this level.');
    }
  }

  private async allocateSlug(tenantId: string, desired: string, excludeId?: string): Promise<string> {
    const base = slugify(desired);
    if (!base) {
      throw new BadRequestException('slug must be a lowercase URL-safe value.');
    }
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.category.findFirst({
        where: { tenantId, slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
