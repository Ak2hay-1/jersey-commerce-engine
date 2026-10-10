import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison. Both sides are hashed first so inputs of
 * different lengths do not leak length through an early return.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || b.length === 0) {
    return false;
  }
  const left = createHash('sha256').update(a, 'utf8').digest();
  const right = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(left, right);
}
