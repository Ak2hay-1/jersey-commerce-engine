import type { PosLookupItem } from '@jersey-commerce/types';
import { lookupBarcode, lookupProducts } from './pos-api';
import { parseScanValue } from './scan-value';

/**
 * Resolve a scanned value the same way as wedge Enter: barcode first, then SKU, then q/slug search.
 */
export async function resolveScan(rawInput: string): Promise<PosLookupItem[]> {
  const parsed = parseScanValue(rawInput);
  if (!parsed.lookupQuery) {
    return [];
  }

  if (parsed.sku) {
    const bySku = await lookupProducts({ sku: parsed.sku, limit: 24 });
    if (bySku.items.length) {
      return bySku.items;
    }
  }

  const barcodeCandidate = parsed.sku ? undefined : parsed.lookupQuery;
  if (barcodeCandidate) {
    const scanned = await lookupBarcode(barcodeCandidate);
    if (scanned) {
      return [scanned];
    }

    const bySku = await lookupProducts({ sku: barcodeCandidate, limit: 24 });
    if (bySku.items.length) {
      return bySku.items;
    }
  }

  if (parsed.slug) {
    const bySlug = await lookupProducts({ slug: parsed.slug, limit: 24 });
    if (bySlug.items.length) {
      return bySlug.items;
    }
  }

  const payload = await lookupProducts({ q: parsed.lookupQuery, limit: 24 });
  return payload.items;
}
