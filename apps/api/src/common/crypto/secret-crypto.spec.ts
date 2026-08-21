import { decryptSecret, encryptSecret, isSecretsKeyConfigured } from './secret-crypto';

describe('secret-crypto', () => {
  const key = 'unit-test-secrets-encryption-key-32chars!';

  it('requires a 32-character encryption key', () => {
    expect(isSecretsKeyConfigured('')).toBe(false);
    expect(isSecretsKeyConfigured('short')).toBe(false);
    expect(isSecretsKeyConfigured(key)).toBe(true);
  });

  it('round-trips a provider secret', () => {
    const payload = encryptSecret('re_test_key', key);
    expect(payload.startsWith('v1:')).toBe(true);
    expect(decryptSecret(payload, key)).toBe('re_test_key');
  });

  it('rejects tampered ciphertext', () => {
    const payload = encryptSecret('re_test_key', key);
    expect(() => decryptSecret(`${payload}x`, key)).toThrow();
  });
});
