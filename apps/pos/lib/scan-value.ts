/** Parsed camera / wedge scan payload before POS lookup. */
export type ParsedScanValue = {
  /** Original trimmed scan text. */
  raw: string;
  /** Explicit SKU from `?sku=` / `sku=`. */
  sku?: string;
  /** Product slug extracted from a jerzyfy.in `/products/...` URL. */
  slug?: string;
  /** Best string to feed into barcode → SKU → q lookup. */
  lookupQuery: string;
};

const PRODUCT_PATH = /\/products\/([^/?#]+)/i;

function hostIsJerzyfy(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'jerzyfy.in' || host.endsWith('.jerzyfy.in');
}

function tryParseUrl(raw: string): URL | null {
  const candidates: string[] = [];
  if (/^https?:\/\//i.test(raw)) {
    candidates.push(raw);
  } else if (/^(?:www\.)?jerzyfy\.in\//i.test(raw) || /^jerzyfy\.in\//i.test(raw)) {
    candidates.push(`https://${raw}`);
  }
  for (const candidate of candidates) {
    try {
      return new URL(candidate);
    } catch {
      // keep trying
    }
  }
  return null;
}

/**
 * Normalise a scanned QR/barcode string into lookup fields.
 * Supports raw barcodes/SKUs, `sku=…`, and jerzyfy.in product URLs (optionally with `?sku=`).
 */
export function parseScanValue(input: string): ParsedScanValue {
  const raw = input.trim();
  if (!raw) {
    return { raw: '', lookupQuery: '' };
  }

  const skuParamOnly = /^sku=(.+)$/i.exec(raw);
  if (skuParamOnly?.[1]) {
    const sku = skuParamOnly[1].trim();
    return { raw, sku, lookupQuery: sku };
  }

  const url = tryParseUrl(raw);
  if (url && hostIsJerzyfy(url.hostname)) {
    const sku = url.searchParams.get('sku')?.trim();
    if (sku) {
      return { raw, sku, lookupQuery: sku };
    }
    const match = PRODUCT_PATH.exec(url.pathname);
    if (match?.[1]) {
      const slug = decodeURIComponent(match[1]).trim();
      if (slug) {
        return { raw, slug, lookupQuery: slug };
      }
    }
  }

  return { raw, lookupQuery: raw };
}
