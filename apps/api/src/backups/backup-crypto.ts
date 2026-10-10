import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * Encrypted backup layout: MAGIC | salt(16) | iv(12) | authTag(16) | ciphertext.
 * The AES-256-GCM key is derived per file from BACKUP_ENCRYPTION_KEY with scrypt and the salt.
 */
const MAGIC = Buffer.from('JZBK1', 'ascii');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + SALT_BYTES + IV_BYTES + TAG_BYTES;
const MIN_KEY_LENGTH = 32;

export const ENCRYPTED_BACKUP_EXTENSION = '.json.gz.enc';

function deriveKey(secret: string, salt: Buffer): Buffer {
  if (secret.length < MIN_KEY_LENGTH) {
    throw new Error(`BACKUP_ENCRYPTION_KEY must be at least ${MIN_KEY_LENGTH} characters.`);
  }
  return scryptSync(secret, salt, 32);
}

export function encryptBackup(plain: Buffer, secret: string): Buffer {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), ciphertext]);
}

export function isEncryptedBackup(data: Buffer): boolean {
  return data.length >= HEADER_BYTES && data.subarray(0, MAGIC.length).equals(MAGIC);
}

export function decryptBackup(data: Buffer, secret: string): Buffer {
  if (!isEncryptedBackup(data)) {
    throw new Error('Not a Jerzyfy encrypted backup file.');
  }
  let offset = MAGIC.length;
  const salt = data.subarray(offset, (offset += SALT_BYTES));
  const iv = data.subarray(offset, (offset += IV_BYTES));
  const tag = data.subarray(offset, (offset += TAG_BYTES));
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret, salt), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(offset)), decipher.final()]);
}
