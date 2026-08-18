import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { InventoryReportResult } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { stockStatus } from '../inventory/inventory-math';
import { rawCount, rawMoneyString } from './reporting-math';
import type { InventoryReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class InventoryReportService {
  constructor(private readonly prisma: PrismaService) {}

  async report(actor: AuthPrincipal, query: InventoryReportQueryDto): Promise<InventoryReportResult> {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const search = query.search?.trim();
    const filters = Prisma.sql`
      WHERE i.tenant_id = ${actor.tenantId}
      ${query.categoryId ? Prisma.sql`AND p.category_id = ${query.categoryId}` : Prisma.sql``}
      ${query.productId ? Prisma.sql`AND p.id = ${query.productId}` : Prisma.sql``}
      ${query.lowStock ? Prisma.sql`AND i.reorder_level > 0 AND i.quantity > 0 AND i.quantity <= i.reorder_level` : Prisma.sql``}
      ${query.outOfStock ? Prisma.sql`AND i.quantity = 0` : Prisma.sql``}
      ${
        search
          ? Prisma.sql`AND (
              p.name ILIKE ${`%${search}%`}
              OR pv.sku ILIKE ${`%${search}%`}
              OR COALESCE(pv.barcode, '') ILIKE ${`%${search}%`}
            )`
          : Prisma.sql``
      }
    `;
    const [totals] = await this.prisma.$queryRaw<
      Array<{
        variants: number;
        quantity: unknown;
        reserved: unknown;
        available: unknown;
        cost_value: unknown;
        selling_value: unknown;
        low_stock: number;
        out_of_stock: number;
      }>
    >`
      SELECT
        COUNT(*)::int AS variants,
        COALESCE(SUM(i.quantity), 0)::int AS quantity,
        COALESCE(SUM(i.reserved_quantity), 0)::int AS reserved,
        COALESCE(SUM(i.available_quantity), 0)::int AS available,
        COALESCE(SUM(i.quantity * pv.cost_price), 0) AS cost_value,
        COALESCE(SUM(i.quantity * pv.selling_price), 0) AS selling_value,
        COUNT(*) FILTER (WHERE i.reorder_level > 0 AND i.quantity > 0 AND i.quantity <= i.reorder_level)::int AS low_stock,
        COUNT(*) FILTER (WHERE i.quantity = 0)::int AS out_of_stock
      FROM inventories i
      INNER JOIN product_variants pv ON pv.id = i.product_variant_id
      INNER JOIN products p ON p.id = pv.product_id
      ${filters}
    `;
    const items = await this.prisma.$queryRaw<
      Array<{
        product_variant_id: string;
        product_id: string;
        product_name: string;
        sku: string;
        size: string | null;
        color: string | null;
        category_id: string | null;
        category_name: string | null;
        quantity: number;
        reserved_quantity: number;
        available_quantity: number;
        reorder_level: number;
        cost_price: unknown;
        selling_price: unknown;
        cost_value: unknown;
        selling_value: unknown;
      }>
    >`
      SELECT
        i.product_variant_id, p.id AS product_id, p.name AS product_name, pv.sku, pv.size, pv.color,
        p.category_id, c.name AS category_name,
        i.quantity, i.reserved_quantity, i.available_quantity, i.reorder_level,
        pv.cost_price, pv.selling_price,
        (i.quantity * pv.cost_price) AS cost_value,
        (i.quantity * pv.selling_price) AS selling_value
      FROM inventories i
      INNER JOIN product_variants pv ON pv.id = i.product_variant_id
      INNER JOIN products p ON p.id = pv.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      ${filters}
      ORDER BY p.name ASC, pv.size ASC
      OFFSET ${skip} LIMIT ${take}
    `;
    return {
      totals: {
        variants: rawCount(totals?.variants),
        quantity: rawCount(totals?.quantity),
        reservedQuantity: rawCount(totals?.reserved),
        availableQuantity: rawCount(totals?.available),
        costValue: rawMoneyString(totals?.cost_value),
        sellingValue: rawMoneyString(totals?.selling_value),
        lowStock: rawCount(totals?.low_stock),
        outOfStock: rawCount(totals?.out_of_stock),
      },
      items: items.map((row) => {
        const variantLabel = [row.size, row.color].filter(Boolean).join(' / ') || 'Default';
        return {
          productVariantId: row.product_variant_id,
          productId: row.product_id,
          productName: row.product_name,
          variantLabel,
          sku: row.sku,
          categoryId: row.category_id,
          categoryName: row.category_name,
          quantity: row.quantity,
          reservedQuantity: row.reserved_quantity,
          availableQuantity: row.available_quantity,
          reorderLevel: row.reorder_level,
          costPrice: rawMoneyString(row.cost_price),
          sellingPrice: rawMoneyString(row.selling_price),
          costValue: rawMoneyString(row.cost_value),
          sellingValue: rawMoneyString(row.selling_value),
          stockStatus: stockStatus(row.quantity, row.reorder_level),
        };
      }),
      meta: toPaginationMeta(page, pageSize, rawCount(totals?.variants)),
    };
  }

  async alerts(actor: AuthPrincipal, kind: 'low' | 'out', take = 8) {
    const filter =
      kind === 'out'
        ? Prisma.sql`AND i.quantity = 0`
        : Prisma.sql`AND i.reorder_level > 0 AND i.quantity > 0 AND i.quantity <= i.reorder_level`;
    const rows = await this.prisma.$queryRaw<
      Array<{
        product_variant_id: string;
        product_name: string;
        size: string | null;
        color: string | null;
        sku: string;
        quantity: number;
        reserved_quantity: number;
        available_quantity: number;
        reorder_level: number;
      }>
    >`
      SELECT i.product_variant_id, p.name AS product_name, pv.size, pv.color, pv.sku,
             i.quantity, i.reserved_quantity, i.available_quantity, i.reorder_level
      FROM inventories i
      INNER JOIN product_variants pv ON pv.id = i.product_variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE i.tenant_id = ${actor.tenantId}
        ${filter}
      ORDER BY i.quantity ASC, p.name ASC
      LIMIT ${take}
    `;
    return rows.map((row) => ({
      productVariantId: row.product_variant_id,
      productName: row.product_name,
      variantLabel: [row.size, row.color].filter(Boolean).join(' / ') || 'Default',
      sku: row.sku,
      quantity: row.quantity,
      reservedQuantity: row.reserved_quantity,
      availableQuantity: row.available_quantity,
      reorderLevel: row.reorder_level,
      stockStatus: stockStatus(row.quantity, row.reorder_level),
    }));
  }
}
