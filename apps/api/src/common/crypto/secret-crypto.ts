import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'v1';

function keyBytes(secretKey: string): Buffer {
  return createHash('sha256').update(secretKey).digest();
}

export function isSecretsKeyConfigured(value?: string | null): boolean {
  return Boolean(value && value.trim().length >= 32);
}

export function encryptSecret(plain: string, secretKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(secretKey), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload: string, secretKey: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(':');
  if (version !== PREFIX || !ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid encrypted secret.');
  }
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(secretKey), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
}
