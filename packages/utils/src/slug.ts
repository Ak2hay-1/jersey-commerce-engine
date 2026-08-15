export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 180;

export function slugify(value: string, maxLength = SLUG_MAX_LENGTH): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug;
}

export function isUrlSafeSlug(value: string): boolean {
  return SLUG_PATTERN.test(value) && value.length <= SLUG_MAX_LENGTH;
}
