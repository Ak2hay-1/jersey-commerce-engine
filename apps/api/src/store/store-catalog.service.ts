import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProductSort } from '@jersey-commerce/types';
import { CatalogStatus, Prisma, VariantStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { parseMoney } from '../catalog/money';
import { toCategoryDetail } from '../catalog/catalog.mapper';
import {
  toFacets,
  toStorefrontListItem,
  toStorefrontProductDetail,
} from './store-catalog.mapper';
import type { StoreCatalogQueryDto } from './dto/store-catalog-query.dto';

const listInclude = {
  category: true,
  images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }] },
  variants: {
    where: { status: VariantStatus.ACTIVE },
    include: { inventory: true },
    orderBy: [{ sellingPrice: 'asc' as const }],
  },
} satisfies Prisma.ProductInclude;

const detailInclude = {
  category: true,
  images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }] },
  variants: {
    include: { inventory: true },
    orderBy: [{ size: 'asc' as const }, { color: 'asc' as const }],
  },
} satisfies Prisma.ProductInclude;

const categoryInclude = {
  parent: true,
  children: {
    where: { status: CatalogStatus.ACTIVE },
    orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }],
  },
  _count: { select: { products: { where: { status: CatalogStatus.ACTIVE } } } },
} satisfies Prisma.CategoryInclude;

@Injectable()
export class StoreCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(tenantId: string, query: StoreCatalogQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = await this.buildProductWhere(tenantId, query);
    const sort = query.sort ?? 'featured';
    const totalItems = await this.prisma.product.count({ where });

    let products;
    if (sort === 'price-asc' || sort === 'price-desc') {
      const priced = await this.prisma.product.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          variants: {
            where: { status: VariantStatus.ACTIVE },
            select: { sellingPrice: true },
            orderBy: { sellingPrice: 'asc' },
            take: 1,
          },
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
      products = pageIds.flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
      });
    } else {
      products = await this.prisma.product.findMany({
        where,
        include: listInclude,
        orderBy: this.orderBy(sort),
        skip,
        take,
      });
    }

    const facetWhere = await this.buildProductWhere(tenantId, {
      ...query,
      size: undefined,
      colour: undefined,
      brand: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      search: undefined,
    });
    const facetSource = await this.prisma.product.findMany({
      where: facetWhere,
      select: {
        brand: true,
        variants: {
          where: { status: VariantStatus.ACTIVE },
          select: { size: true, color: true, sellingPrice: true, status: true },
        },
      },
    });

    return {
      items: products.map((item) => toStorefrontListItem(item)),
      meta: toPaginationMeta(page, pageSize, totalItems),
      facets: toFacets(
        facetSource.flatMap((item) => item.variants),
        facetSource.map((item) => item.brand),
      ),
    };
  }

  async getProductBySlug(tenantId: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, slug, status: CatalogStatus.ACTIVE },
      include: detailInclude,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const related = product.categoryId
      ? await this.prisma.product.findMany({
          where: {
            tenantId,
            status: CatalogStatus.ACTIVE,
            categoryId: product.categoryId,
            id: { not: product.id },
          },
          include: listInclude,
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          take: 8,
        })
      : [];
    return toStorefrontProductDetail(
      product,
      related.map((item) => toStorefrontListItem(item)),
    );
  }

  async listCategories(tenantId: string) {
    const items = await this.prisma.category.findMany({
      where: { tenantId, status: CatalogStatus.ACTIVE },
      include: categoryInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return items.map((item) => toCategoryDetail(item));
  }

  async getCategoryByPath(tenantId: string, slugs: string[]) {
    const path = slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean);
    if (path.length === 0) {
      throw new NotFoundException('Category not found');
    }
    const last = path[path.length - 1];
    if (!last) {
      throw new NotFoundException('Category not found');
    }
    const category = await this.prisma.category.findFirst({
      where: { tenantId, slug: last, status: CatalogStatus.ACTIVE },
      include: categoryInclude,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (path.length > 1) {
      const ancestors: string[] = [];
      let cursor: { id: string; slug: string; parentId: string | null } | null = category;
      while (cursor) {
        ancestors.unshift(cursor.slug);
        if (!cursor.parentId) {
          break;
        }
        cursor = await this.prisma.category.findFirst({
          where: { id: cursor.parentId, tenantId, status: CatalogStatus.ACTIVE },
          select: { id: true, slug: true, parentId: true },
        });
      }
      if (ancestors.join('/') !== path.join('/')) {
        throw new NotFoundException('Category not found');
      }
    }
    return toCategoryDetail(category);
  }

  async search(tenantId: string, query: StoreCatalogQueryDto) {
    const search = query.search?.trim() ?? '';
    if (!search) {
      return {
        query: search,
        suggestions: [],
        products: [],
        meta: toPaginationMeta(1, query.limit ?? query.pageSize ?? 20, 0),
      };
    }
    const listed = await this.listProducts(tenantId, { ...query, search, sort: query.sort ?? 'featured' });
    const categories = await this.prisma.category.findMany({
      where: {
        tenantId,
        status: CatalogStatus.ACTIVE,
        name: { contains: search, mode: 'insensitive' },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 5,
    });
    const suggestions = [
      ...listed.items.slice(0, 6).map((item) => ({
        type: 'product' as const,
        id: item.id,
        name: item.name,
        slug: item.slug,
        href: `/products/${item.slug}`,
        imageUrl: item.primaryImage?.url ?? null,
      })),
      ...categories.map((category) => ({
        type: 'category' as const,
        id: category.id,
        name: category.name,
        slug: category.slug,
        href: `/category/${category.slug}`,
        imageUrl: category.image,
      })),
    ];
    return {
      query: search,
      suggestions,
      products: listed.items,
      meta: listed.meta,
    };
  }

  async featured(tenantId: string, take = 8) {
    const items = await this.prisma.product.findMany({
      where: { tenantId, status: CatalogStatus.ACTIVE, featured: true },
      include: listInclude,
      orderBy: [{ createdAt: 'desc' }],
      take,
    });
    return items.map((item) => toStorefrontListItem(item));
  }

  async newest(tenantId: string, take = 8) {
    const items = await this.prisma.product.findMany({
      where: { tenantId, status: CatalogStatus.ACTIVE },
      include: listInclude,
      orderBy: [{ createdAt: 'desc' }],
      take,
    });
    return items.map((item) => toStorefrontListItem(item));
  }

  async bestSellers(tenantId: string, take = 8) {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productVariantId'],
      where: {
        tenantId,
        order: { status: { notIn: ['CANCELLED'] } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: take * 4,
    });
    if (grouped.length === 0) {
      return this.featured(tenantId, take);
    }
    const variants = await this.prisma.productVariant.findMany({
      where: { tenantId, id: { in: grouped.map((row) => row.productVariantId) } },
      select: { id: true, productId: true },
    });
    const scored = new Map<string, number>();
    const qtyByVariant = new Map(grouped.map((row) => [row.productVariantId, row._sum.quantity ?? 0]));
    for (const variant of variants) {
      scored.set(variant.productId, (scored.get(variant.productId) ?? 0) + (qtyByVariant.get(variant.id) ?? 0));
    }
    const ranked = [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, take).map(([id]) => id);
    const products = await this.prisma.product.findMany({
      where: { tenantId, status: CatalogStatus.ACTIVE, id: { in: ranked } },
      include: listInclude,
    });
    const byId = new Map(products.map((item) => [item.id, item]));
    const ordered = ranked.flatMap((id) => {
      const item = byId.get(id);
      return item ? [toStorefrontListItem(item)] : [];
    });
    if (ordered.length < take) {
      const extra = await this.featured(tenantId, take);
      const seen = new Set(ordered.map((item) => item.id));
      for (const item of extra) {
        if (!seen.has(item.id)) {
          ordered.push(item);
          seen.add(item.id);
        }
        if (ordered.length >= take) {
          break;
        }
      }
    }
    return ordered;
  }

  async productsBySlugs(tenantId: string, slugs: string[]) {
    if (slugs.length === 0) {
      return [];
    }
    const products = await this.prisma.product.findMany({
      where: { tenantId, status: CatalogStatus.ACTIVE, slug: { in: slugs } },
      include: listInclude,
    });
    const bySlug = new Map(products.map((item) => [item.slug, item]));
    return slugs.flatMap((slug) => {
      const item = bySlug.get(slug);
      return item ? [toStorefrontListItem(item)] : [];
    });
  }

  async categoriesBySlugs(tenantId: string, slugs: string[]) {
    if (slugs.length === 0) {
      return [];
    }
    const categories = await this.prisma.category.findMany({
      where: { tenantId, status: CatalogStatus.ACTIVE, slug: { in: slugs } },
      include: categoryInclude,
    });
    const bySlug = new Map(categories.map((item) => [item.slug, item]));
    return slugs.flatMap((slug) => {
      const item = bySlug.get(slug);
      return item ? [toCategoryDetail(item)] : [];
    });
  }

  private orderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return [{ createdAt: 'asc' }];
      case 'name':
        return [{ name: 'asc' }];
      case 'newest':
        return [{ createdAt: 'desc' }];
      default:
        return [{ featured: 'desc' }, { createdAt: 'desc' }];
    }
  }

  private async buildProductWhere(tenantId: string, query: StoreCatalogQueryDto): Promise<Prisma.ProductWhereInput> {
    const variantFilters: Prisma.ProductVariantWhereInput[] = [{ status: VariantStatus.ACTIVE }];
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
    const categoryIds = await this.resolveCategoryIds(tenantId, query.categoryId, query.categorySlug);
    return {
      tenantId,
      status: CatalogStatus.ACTIVE,
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
            ],
          }
        : {}),
    };
  }

  private async resolveCategoryIds(
    tenantId: string,
    categoryId?: string,
    categorySlug?: string,
  ): Promise<string[] | undefined> {
    if (!categoryId && !categorySlug) {
      return undefined;
    }
    const root = categoryId
      ? await this.prisma.category.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } })
      : await this.prisma.category.findFirst({
          where: { tenantId, slug: categorySlug, status: CatalogStatus.ACTIVE },
          select: { id: true },
        });
    if (!root) {
      return categoryId ? [categoryId] : [];
    }
    const ids = [root.id];
    let frontier = [root.id];
    for (let depth = 0; depth < 16 && frontier.length > 0; depth += 1) {
      const children = await this.prisma.category.findMany({
        where: { tenantId, parentId: { in: frontier }, status: CatalogStatus.ACTIVE },
        select: { id: true },
      });
      frontier = children.map((child) => child.id).filter((id) => !ids.includes(id));
      ids.push(...frontier);
    }
    return ids;
  }
}
