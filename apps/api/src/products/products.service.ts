import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { slugify } from '@jersey-commerce/utils';
import type { ProductDetail, ProductSort } from '@jersey-commerce/types';
import { CatalogStatus, Prisma, VariantStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { assertValidPrices, parseMoney, optionalMoney, parseWeight } from '../catalog/money';
import { parseTaxRate } from '../finance/tax';
import { normalizeBarcode, normalizeOptionalText, normalizeSku, throwUniqueConflict } from '../catalog/unique';
import { SkuGenerator } from '../catalog/sku-generator';
import { toImageDto, toProductDetail, toProductListItem, toVariantDto } from '../catalog/catalog.mapper';
import type { AuthPrincipal } from '../common/context/request-context';
import type {
  CreateProductDto,
  CreateProductImageDto,
  ProductVariantInputDto,
  UpdateProductDto,
  UpdateProductImageDto,
} from './dto/product-mutations.dto';
import type { ProductQueryDto } from './dto/product-query.dto';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/storage.types';
import { ALLOWED_IMAGE_MIME_TYPES, extensionForMime, IMAGE_MAX_BYTES, sniffImageMime } from '../storage/image-validation';
import { InventoryService } from '../inventory/inventory.service';

const listInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { select: { sellingPrice: true }, orderBy: { sellingPrice: 'asc' as const } },
} satisfies Prisma.ProductInclude;

const detailInclude = {
  category: true,
  images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }] },
  variants: { orderBy: [{ size: 'asc' as const }, { color: 'asc' as const }] },
} satisfies Prisma.ProductInclude;

export const posVariantInclude = {
  inventory: true,
  product: {
    include: {
      images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }] },
    },
  },
} satisfies Prisma.ProductVariantInclude;

type UploadedFile = {
  buffer: Buffer;
  size: number;
  mimetype?: string;
  originalname?: string;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly audit: AuditService,
    private readonly skus: SkuGenerator,
    private readonly inventory: InventoryService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async create(dto: CreateProductDto, actor: AuthPrincipal): Promise<ProductDetail> {
    if (!dto.variants?.length) {
      throw new BadRequestException('At least one variant is required.');
    }
    const tenantId = this.tenantContext.currentTenantId;
    const categoryId = await this.assertCategory(dto.categoryId);
    const slug = await this.allocateProductSlug(tenantId, dto.slug ?? slugify(dto.name));
    const occupiedSkus = await this.occupiedSkus(tenantId);
    const occupiedBarcodes = await this.occupiedBarcodes(tenantId);
    const variantRows = dto.variants.map((variant) =>
      this.buildVariantRow(variant, { productSlug: slug, occupiedSkus, occupiedBarcodes }),
    );
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            tenantId,
            name: dto.name.trim(),
            slug,
            description: normalizeOptionalText(dto.description),
            shortDescription: normalizeOptionalText(dto.shortDescription),
            brand: normalizeOptionalText(dto.brand),
            categoryId,
            status: dto.status ?? CatalogStatus.DRAFT,
            featured: dto.featured ?? false,
            seoTitle: normalizeOptionalText(dto.seoTitle),
            seoDescription: normalizeOptionalText(dto.seoDescription),
          },
        });
        for (const row of variantRows) {
          const createdVariant = await tx.productVariant.create({
            data: { ...row, tenantId, productId: product.id },
          });
          await this.inventory.ensureRecord(tenantId, createdVariant.id, tx);
        }
        return tx.product.findFirstOrThrow({ where: { id: product.id, tenantId }, include: detailInclude });
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.PRODUCT_CREATED,
        tenantId,
        userId: actor.userId,
        entity: 'Product',
        entityId: created.id,
        metadata: { name: created.name, slug: created.slug, variantCount: variantRows.length },
      });
      return toProductDetail(created);
    } catch (error) {
      throwUniqueConflict(error);
      throw error;
    }
  }

  async findAll(query: ProductQueryDto) {
    const tenantId = this.tenantContext.currentTenantId;
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = await this.buildProductWhere(tenantId, query);
    const sort = this.whitelistSort(query.sort);
    const totalItems = await this.prisma.product.count({ where });

    if (sort === 'price-asc' || sort === 'price-desc') {
      const priced = await this.prisma.product.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          variants: { select: { sellingPrice: true }, orderBy: { sellingPrice: 'asc' }, take: 1 },
        },
      });
      priced.sort((a, b) => {
        const left = a.variants[0]?.sellingPrice ?? new Prisma.Decimal(0);
        const right = b.variants[0]?.sellingPrice ?? new Prisma.Decimal(0);
        const compared = new Prisma.Decimal(left).comparedTo(right);
        if (compared === 0) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return sort === 'price-asc' ? compared : -compared;
      });
      const pageIds = priced.slice(skip, skip + take).map((item) => item.id);
      const unordered = await this.prisma.product.findMany({
        where: { tenantId, id: { in: pageIds } },
        include: listInclude,
      });
      const byId = new Map(unordered.map((item) => [item.id, item]));
      const items = pageIds.flatMap((id) => {
        const item = byId.get(id);
        return item ? [toProductListItem(item)] : [];
      });
      return { success: true as const, data: items, meta: toPaginationMeta(page, pageSize, totalItems) };
    }

    const items = await this.prisma.product.findMany({
      where,
      include: listInclude,
      orderBy: this.prismaOrder(sort),
      skip,
      take,
    });
    return {
      success: true as const,
      data: items.map((item) => toProductListItem(item)),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async findById(id: string): Promise<ProductDetail> {
    return toProductDetail(await this.requireProduct(id));
  }

  async update(id: string, dto: UpdateProductDto, actor: AuthPrincipal): Promise<ProductDetail> {
    const tenantId = this.tenantContext.currentTenantId;
    const existing = await this.requireProduct(id);
    const categoryId = dto.categoryId === undefined ? existing.categoryId : await this.assertCategory(dto.categoryId);
    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = await this.allocateProductSlug(tenantId, dto.slug, existing.id);
    }
    try {
      const updated = await this.prisma.product.update({
        where: { id: existing.id },
        data: {
          name: dto.name?.trim(),
          slug,
          description: dto.description === undefined ? undefined : normalizeOptionalText(dto.description),
          shortDescription:
            dto.shortDescription === undefined ? undefined : normalizeOptionalText(dto.shortDescription),
          brand: dto.brand === undefined ? undefined : normalizeOptionalText(dto.brand),
          categoryId,
          status: dto.status,
          featured: dto.featured,
          seoTitle: dto.seoTitle === undefined ? undefined : normalizeOptionalText(dto.seoTitle),
          seoDescription: dto.seoDescription === undefined ? undefined : normalizeOptionalText(dto.seoDescription),
        },
        include: detailInclude,
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.PRODUCT_UPDATED,
        tenantId,
        userId: actor.userId,
        entity: 'Product',
        entityId: updated.id,
        metadata: { fields: Object.keys(dto) },
      });
      return toProductDetail(updated);
    } catch (error) {
      throwUniqueConflict(error);
      throw error;
    }
  }

  async remove(id: string, actor: AuthPrincipal): Promise<ProductDetail> {
    const tenantId = this.tenantContext.currentTenantId;
    const existing = await this.requireProduct(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.productVariant.updateMany({
        where: { tenantId, productId: existing.id },
        data: { status: VariantStatus.INACTIVE },
      });
      return tx.product.update({
        where: { id: existing.id },
        data: { status: CatalogStatus.ARCHIVED, featured: false },
        include: detailInclude,
      });
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.PRODUCT_ARCHIVED,
      tenantId,
      userId: actor.userId,
      entity: 'Product',
      entityId: updated.id,
      metadata: { reason: 'DELETE_ARCHIVES_TO_PRESERVE_HISTORY' },
    });
    return toProductDetail(updated);
  }

  async createVariant(productId: string, dto: ProductVariantInputDto, actor: AuthPrincipal) {
    const tenantId = this.tenantContext.currentTenantId;
    const product = await this.requireProduct(productId);
    const occupiedSkus = await this.occupiedSkus(tenantId);
    const occupiedBarcodes = await this.occupiedBarcodes(tenantId);
    const row = this.buildVariantRow(dto, { productSlug: product.slug, occupiedSkus, occupiedBarcodes });
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const variant = await tx.productVariant.create({
          data: { ...row, tenantId, productId: product.id },
        });
        await this.inventory.ensureRecord(tenantId, variant.id, tx);
        return variant;
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.PRODUCT_VARIANT_CREATED,
        tenantId,
        userId: actor.userId,
        entity: 'ProductVariant',
        entityId: created.id,
        metadata: { productId: product.id, sku: created.sku },
      });
      return toVariantDto(created);
    } catch (error) {
      throwUniqueConflict(error);
      throw error;
    }
  }

  async updateVariant(productId: string, variantId: string, dto: ProductVariantInputDto, actor: AuthPrincipal) {
    const tenantId = this.tenantContext.currentTenantId;
    const variant = await this.requireVariant(productId, variantId);
    const occupiedSkus = await this.occupiedSkus(tenantId, variant.id);
    const occupiedBarcodes = await this.occupiedBarcodes(tenantId, variant.id);
    if (dto.sku && normalizeSku(dto.sku) !== variant.sku) {
      if (occupiedSkus.has(normalizeSku(dto.sku))) {
        throw new ConflictException('A variant with this SKU already exists in this store.');
      }
    }
    const barcode = dto.barcode === undefined ? variant.barcode : normalizeBarcode(dto.barcode);
    if (barcode && occupiedBarcodes.has(barcode) && barcode !== variant.barcode) {
      throw new ConflictException('A variant with this barcode already exists in this store.');
    }
    const costPrice = dto.costPrice === undefined ? variant.costPrice : parseMoney(dto.costPrice, 'costPrice');
    const sellingPrice =
      dto.sellingPrice === undefined ? variant.sellingPrice : parseMoney(dto.sellingPrice, 'sellingPrice');
    const compareAtPrice =
      dto.compareAtPrice === undefined ? variant.compareAtPrice : optionalMoney(dto.compareAtPrice, 'compareAtPrice');
    assertValidPrices({ costPrice, sellingPrice, compareAtPrice });
    try {
      const updated = await this.prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          sku: dto.sku ? normalizeSku(dto.sku) : undefined,
          barcode,
          size: dto.size === undefined ? undefined : normalizeOptionalText(dto.size),
          color: dto.colour === undefined ? undefined : normalizeOptionalText(dto.colour),
          costPrice,
          sellingPrice,
          compareAtPrice,
          weight: dto.weight === undefined ? undefined : parseWeight(dto.weight),
          taxRate: dto.taxRate === undefined ? undefined : parseTaxRate(dto.taxRate),
          taxInclusive: dto.taxInclusive,
          status: dto.status,
        },
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.PRODUCT_VARIANT_UPDATED,
        tenantId,
        userId: actor.userId,
        entity: 'ProductVariant',
        entityId: updated.id,
        metadata: {
          productId,
          fields: Object.keys(dto),
          note: 'Current prices changed only. Historical sale and purchase prices are unchanged.',
        },
      });
      return toVariantDto(updated);
    } catch (error) {
      throwUniqueConflict(error);
      throw error;
    }
  }

  async archiveVariant(productId: string, variantId: string, actor: AuthPrincipal) {
    const tenantId = this.tenantContext.currentTenantId;
    const variant = await this.requireVariant(productId, variantId);
    const historyCount = await this.variantHistoryCount(variant.id);
    if (historyCount > 0) {
      const updated = await this.prisma.productVariant.update({
        where: { id: variant.id },
        data: { status: VariantStatus.INACTIVE },
      });
      await this.audit.log({
        action: AUDIT_ACTIONS.PRODUCT_VARIANT_ARCHIVED,
        tenantId,
        userId: actor.userId,
        entity: 'ProductVariant',
        entityId: updated.id,
        metadata: { productId, historyCount },
      });
      return toVariantDto(updated);
    }
    await this.prisma.inventory.deleteMany({ where: { tenantId, productVariantId: variant.id } });
    await this.prisma.productVariant.delete({ where: { id: variant.id } });
    await this.audit.log({
      action: AUDIT_ACTIONS.PRODUCT_VARIANT_ARCHIVED,
      tenantId,
      userId: actor.userId,
      entity: 'ProductVariant',
      entityId: variant.id,
      metadata: { productId, deleted: true },
    });
    return { id: variant.id, deleted: true };
  }

  async addImage(productId: string, dto: CreateProductImageDto, file: UploadedFile | undefined, actor: AuthPrincipal) {
    const tenantId = this.tenantContext.currentTenantId;
    const product = await this.requireProduct(productId);
    const stored = file ? await this.storeValidatedImage(tenantId, product.id, file) : null;
    if (!stored && !dto.url) {
      throw new BadRequestException('Upload an image file or provide a URL.');
    }
    const count = product.images.length;
    const isPrimary = dto.isPrimary ?? count === 0;
    const created = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.productImage.updateMany({
          where: { tenantId, productId: product.id },
          data: { isPrimary: false },
        });
      }
      return tx.productImage.create({
        data: {
          tenantId,
          productId: product.id,
          url: stored?.url ?? dto.url!.trim(),
          storageKey: stored?.storageKey,
          altText: normalizeOptionalText(dto.altText) ?? product.name,
          sortOrder: dto.sortOrder ?? count,
          isPrimary,
        },
      });
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.PRODUCT_IMAGE_CREATED,
      tenantId,
      userId: actor.userId,
      entity: 'ProductImage',
      entityId: created.id,
      metadata: { productId: product.id },
    });
    return toImageDto(created);
  }

  async updateImage(productId: string, imageId: string, dto: UpdateProductImageDto, actor: AuthPrincipal) {
    const tenantId = this.tenantContext.currentTenantId;
    const image = await this.requireImage(productId, imageId);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true) {
        await tx.productImage.updateMany({
          where: { tenantId, productId, id: { not: image.id } },
          data: { isPrimary: false },
        });
      }
      return tx.productImage.update({
        where: { id: image.id },
        data: {
          altText: dto.altText === undefined ? undefined : normalizeOptionalText(dto.altText),
          sortOrder: dto.sortOrder,
          isPrimary: dto.isPrimary,
        },
      });
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.PRODUCT_IMAGE_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'ProductImage',
      entityId: updated.id,
      metadata: { productId },
    });
    return toImageDto(updated);
  }

  async deleteImage(productId: string, imageId: string, actor: AuthPrincipal) {
    const tenantId = this.tenantContext.currentTenantId;
    const image = await this.requireImage(productId, imageId);
    await this.prisma.productImage.delete({ where: { id: image.id } });
    if (image.storageKey) {
      await this.storage.delete(image.storageKey);
    }
    if (image.isPrimary) {
      const next = await this.prisma.productImage.findFirst({
        where: { tenantId, productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await this.prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
    await this.audit.log({
      action: AUDIT_ACTIONS.PRODUCT_IMAGE_DELETED,
      tenantId,
      userId: actor.userId,
      entity: 'ProductImage',
      entityId: image.id,
      metadata: { productId },
    });
    return { id: image.id, deleted: true };
  }

  /**
   * Future bulk import / price updates / activation / category assignment should
   * call the same write helpers used by the HTTP layer (`create`, `update`,
   * `createVariant`) inside a transaction. CSV import is intentionally not built
   * in this phase.
   */
  prepareBulkOperations() {
    return {
      createOne: this.create.bind(this),
      updateOne: this.update.bind(this),
      archiveOne: this.remove.bind(this),
    };
  }

  /**
   * POS lookup reuses catalog identity (name / SKU / barcode) rather than a second catalog.
   * Barcode and SKU use exact unique indexes when provided.
   */
  async lookupVariantsForPos(query: { barcode?: string; sku?: string; search?: string; take?: number }) {
    const tenantId = this.tenantContext.currentTenantId;
    const take = Math.min(Math.max(query.take ?? 20, 1), 50);
    if (query.barcode) {
      const barcode = normalizeBarcode(query.barcode);
      if (!barcode) {
        return [];
      }
      const variant = await this.prisma.productVariant.findFirst({
        where: { tenantId, barcode },
        include: posVariantInclude,
      });
      return variant ? [variant] : [];
    }
    if (query.sku) {
      const sku = normalizeSku(query.sku);
      const variant = await this.prisma.productVariant.findFirst({
        where: { tenantId, sku },
        include: posVariantInclude,
      });
      return variant ? [variant] : [];
    }
    const search = query.search?.trim();
    if (!search) {
      return [];
    }
    return this.prisma.productVariant.findMany({
      where: {
        tenantId,
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      },
      include: posVariantInclude,
      orderBy: [{ sku: 'asc' }],
      take,
    });
  }

  private buildVariantRow(
    dto: ProductVariantInputDto,
    ctx: { productSlug: string; occupiedSkus: Set<string>; occupiedBarcodes: Set<string> },
  ) {
    if (dto.costPrice === undefined || dto.sellingPrice === undefined) {
      throw new BadRequestException('costPrice and sellingPrice are required for new variants.');
    }
    const costPrice = parseMoney(dto.costPrice, 'costPrice');
    const sellingPrice = parseMoney(dto.sellingPrice, 'sellingPrice');
    const compareAtPrice = optionalMoney(dto.compareAtPrice, 'compareAtPrice');
    assertValidPrices({ costPrice, sellingPrice, compareAtPrice });
    const sku = this.skus.resolve(dto.sku, {
      productSlug: ctx.productSlug,
      size: dto.size,
      colour: dto.colour,
      occupied: ctx.occupiedSkus,
    });
    const barcode = normalizeBarcode(dto.barcode);
    if (barcode) {
      if (ctx.occupiedBarcodes.has(barcode)) {
        throw new ConflictException('A variant with this barcode already exists in this store.');
      }
      ctx.occupiedBarcodes.add(barcode);
    }
    return {
      sku,
      barcode,
      size: normalizeOptionalText(dto.size),
      color: normalizeOptionalText(dto.colour),
      costPrice,
      sellingPrice,
      compareAtPrice,
      weight: parseWeight(dto.weight),
      taxRate: dto.taxRate === undefined ? null : parseTaxRate(dto.taxRate),
      taxInclusive: dto.taxInclusive ?? null,
      status: dto.status ?? VariantStatus.ACTIVE,
    };
  }

  private async buildProductWhere(tenantId: string, query: ProductQueryDto): Promise<Prisma.ProductWhereInput> {
    const variantFilters: Prisma.ProductVariantWhereInput[] = [];
    if (query.size) {
      variantFilters.push({ size: { equals: query.size, mode: 'insensitive' } });
    }
    if (query.colour) {
      variantFilters.push({ color: { equals: query.colour, mode: 'insensitive' } });
    }
    if (query.minPrice || query.maxPrice) {
      variantFilters.push({
        sellingPrice: {
          ...(query.minPrice ? { gte: parseMoney(query.minPrice, 'minPrice') } : {}),
          ...(query.maxPrice ? { lte: parseMoney(query.maxPrice, 'maxPrice') } : {}),
        },
      });
    }
    const search = query.search?.trim();
    const categoryIds = query.categoryId ? await this.categoryWithDescendants(tenantId, query.categoryId) : undefined;
    return {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.featured === undefined ? {} : { featured: query.featured }),
      ...(query.brand ? { brand: { equals: query.brand, mode: 'insensitive' } } : {}),
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(variantFilters.length > 0 ? { variants: { some: { AND: variantFilters } } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
              { variants: { some: { barcode: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
  }

  private whitelistSort(sort?: ProductSort): ProductSort {
    return sort ?? 'newest';
  }

  private prismaOrder(sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return [{ createdAt: 'asc' }];
      case 'name':
        return [{ name: 'asc' }];
      case 'featured':
        return [{ featured: 'desc' }, { createdAt: 'desc' }];
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  private async categoryWithDescendants(tenantId: string, categoryId: string): Promise<string[]> {
    const root = await this.prisma.category.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } });
    if (!root) {
      return [categoryId];
    }
    const ids = [root.id];
    let frontier = [root.id];
    for (let depth = 0; depth < 16 && frontier.length > 0; depth += 1) {
      const children = await this.prisma.category.findMany({
        where: { tenantId, parentId: { in: frontier } },
        select: { id: true },
      });
      frontier = children.map((child) => child.id).filter((id) => !ids.includes(id));
      ids.push(...frontier);
    }
    return ids;
  }

  private async allocateProductSlug(tenantId: string, desired: string, excludeId?: string): Promise<string> {
    const base = slugify(desired);
    if (!base) {
      throw new BadRequestException('slug must be a lowercase URL-safe value.');
    }
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.product.findFirst({
        where: { tenantId, slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { id: true },
      })
    ) {
      if (excludeId && candidate === desired) {
        throw new ConflictException('A product with this slug already exists in this store.');
      }
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private async assertCategory(categoryId: string | null | undefined): Promise<string | null> {
    if (!categoryId) {
      return null;
    }
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, tenantId: this.tenantContext.currentTenantId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException('Category was not found in this store.');
    }
    return category.id;
  }

  private async occupiedSkus(tenantId: string, excludeVariantId?: string): Promise<Set<string>> {
    const rows = await this.prisma.productVariant.findMany({
      where: { tenantId, ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}) },
      select: { sku: true },
    });
    return new Set(rows.map((row) => row.sku));
  }

  private async occupiedBarcodes(tenantId: string, excludeVariantId?: string): Promise<Set<string>> {
    const rows = await this.prisma.productVariant.findMany({
      where: {
        tenantId,
        barcode: { not: null },
        ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}),
      },
      select: { barcode: true },
    });
    return new Set(rows.map((row) => row.barcode).filter((value): value is string => Boolean(value)));
  }

  private async requireProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: this.tenantContext.currentTenantId },
      include: detailInclude,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async requireVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, tenantId: this.tenantContext.currentTenantId },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    return variant;
  }

  private async requireImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId, tenantId: this.tenantContext.currentTenantId },
    });
    if (!image) {
      throw new NotFoundException('Product image not found');
    }
    return image;
  }

  private async variantHistoryCount(variantId: string): Promise<number> {
    const tenantId = this.tenantContext.currentTenantId;
    const [sales, orders, purchases, movements] = await Promise.all([
      this.prisma.saleItem.count({ where: { tenantId, productVariantId: variantId } }),
      this.prisma.orderItem.count({ where: { tenantId, productVariantId: variantId } }),
      this.prisma.purchaseItem.count({ where: { tenantId, productVariantId: variantId } }),
      this.prisma.inventoryMovement.count({ where: { tenantId, productVariantId: variantId } }),
    ]);
    return sales + orders + purchases + movements;
  }

  private async storeValidatedImage(tenantId: string, productId: string, file: UploadedFile) {
    if (file.size > IMAGE_MAX_BYTES) {
      throw new BadRequestException(`Image files must be ${IMAGE_MAX_BYTES / (1024 * 1024)}MB or smaller.`);
    }
    const sniffed = sniffImageMime(file.buffer);
    if (!sniffed || !ALLOWED_IMAGE_MIME_TYPES.includes(sniffed)) {
      throw new BadRequestException('Only JPEG, PNG, and WEBP images are allowed.');
    }
    const key = `${tenantId}/products/${productId}/${randomUUID()}.${extensionForMime(sniffed)}`;
    return this.storage.put({ tenantId, key, body: file.buffer, contentType: sniffed });
  }
}
