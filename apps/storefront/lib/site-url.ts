const FALLBACK_SITE_URL = 'https://www.jerzyfy.in';

/** Canonical public storefront origin, without a trailing slash. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() || FALLBACK_SITE_URL;
  return raw.replace(/\/$/, '');
}
