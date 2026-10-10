import { gunzipSync } from 'node:zlib';
import { decryptBackup, encryptBackup, isEncryptedBackup } from './backup-crypto';
import { backupFileName, compressBackupPayload } from './backup-exporter';

const KEY = 'k'.repeat(48);

describe('backup-crypto', () => {
  it('round-trips a compressed backup payload', () => {
    const payload = { format: 'jersey-commerce-backup', data: { customers: [{ name: 'Asha' }] } };
    const encrypted = encryptBackup(compressBackupPayload(payload), KEY);

    expect(isEncryptedBackup(encrypted)).toBe(true);
    expect(encrypted.includes(Buffer.from('Asha'))).toBe(false);
    expect(JSON.parse(gunzipSync(decryptBackup(encrypted, KEY)).toString('utf8'))).toEqual(payload);
  });

  it('uses a fresh salt and IV per file', () => {
    const plain = Buffer.from('same input');
    expect(encryptBackup(plain, KEY).equals(encryptBackup(plain, KEY))).toBe(false);
  });

  it('rejects the wrong key and tampered ciphertext', () => {
    const encrypted = encryptBackup(Buffer.from('secret data'), KEY);
    expect(() => decryptBackup(encrypted, 'x'.repeat(48))).toThrow();

    const tampered = Buffer.from(encrypted);
    tampered.writeUInt8(tampered.readUInt8(tampered.length - 1) ^ 0xff, tampered.length - 1);
    expect(() => decryptBackup(tampered, KEY)).toThrow();
  });

  it('rejects short keys and non-backup input', () => {
    expect(() => encryptBackup(Buffer.from('x'), 'short')).toThrow(/at least 32/);
    expect(() => decryptBackup(Buffer.from('plain gzip'), KEY)).toThrow(/Not a Jerzyfy/);
  });

  it('names encrypted backups with the .enc suffix', () => {
    const at = new Date('2026-01-02T03:04:05.000Z');
    expect(backupFileName('demo-jersey-store', at, true)).toMatch(/\.json\.gz\.enc$/);
    expect(backupFileName('demo-jersey-store', at)).toMatch(/\.json\.gz$/);
  });
});
