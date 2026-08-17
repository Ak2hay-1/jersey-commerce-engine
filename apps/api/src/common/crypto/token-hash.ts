import { createHash, randomBytes } from 'node:crypto';

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createOpaqueToken(prefix: string): string {
  return `${prefix}${randomBytes(48).toString('base64url')}`;
}
