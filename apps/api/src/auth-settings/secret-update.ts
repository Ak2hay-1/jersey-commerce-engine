import { encryptSecret, isSecretsKeyConfigured } from '../common/crypto/secret-crypto';

export function applySecretUpdate(
  incoming: string | null | undefined,
  existingEncrypted: string | null,
  secretKey: string | undefined,
): string | null {
  if (incoming === undefined || incoming === '') {
    return existingEncrypted;
  }
  if (incoming === null) {
    return null;
  }
  if (!isSecretsKeyConfigured(secretKey)) {
    throw new Error('SECRETS_ENCRYPTION_KEY must be at least 32 characters to store provider secrets.');
  }
  return encryptSecret(incoming, secretKey!.trim());
}
