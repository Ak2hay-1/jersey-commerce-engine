import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { toLookupItem } from './pos.mapper';
import type { PosLookupQueryDto } from './dto/lookup.dto';

@Injectable()
export class PosLookupService {
  constructor(private readonly products: ProductsService) {}

  async search(query: PosLookupQueryDto) {
    const q = query.q?.trim();
    if (query.barcode?.trim()) {
      const variants = await this.products.lookupVariantsForPos({ barcode: query.barcode, take: query.limit });
      return { items: variants.map(toLookupItem) };
    }
    if (query.sku?.trim()) {
      const variants = await this.products.lookupVariantsForPos({ sku: query.sku, take: query.limit });
      return { items: variants.map(toLookupItem) };
    }
    if (q && /^\d{8,}$/.test(q)) {
      const exact = await this.products.lookupVariantsForPos({ barcode: q, take: query.limit });
      if (exact.length > 0) {
        return { items: exact.map(toLookupItem) };
      }
    }
    if (!q) {
      return { items: [] };
    }
    const variants = await this.products.lookupVariantsForPos({ search: q, take: query.limit });
    return { items: variants.map(toLookupItem) };
  }

  async barcode(barcode: string) {
    const variants = await this.products.lookupVariantsForPos({ barcode, take: 1 });
    const item = variants[0];
    if (!item) {
      return null;
    }
    return toLookupItem(item);
  }
}
