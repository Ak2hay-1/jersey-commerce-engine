import { ENCRYPTED_BACKUP_EXTENSION } from './backup-crypto';
import {
  backupObjectKey,
  backupObjectPrefix,
  resolveR2BackupConfig,
} from './backup-r2';

describe('resolveR2BackupConfig', () => {
  const full = {
    R2_ACCOUNT_ID: 'acct123',
    R2_ACCESS_KEY_ID: 'key',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BACKUP_BUCKET: 'jerzyfy-backups',
  };

  it('returns null when any required field is missing', () => {
    expect(resolveR2BackupConfig({})).toBeNull();
    expect(resolveR2BackupConfig({ ...full, R2_ACCESS_KEY_ID: '' })).toBeNull();
    expect(resolveR2BackupConfig({ ...full, R2_SECRET_ACCESS_KEY: '  ' })).toBeNull();
    expect(resolveR2BackupConfig({ ...full, R2_BACKUP_BUCKET: '' })).toBeNull();
    expect(
      resolveR2BackupConfig({
        R2_ACCESS_KEY_ID: 'key',
        R2_SECRET_ACCESS_KEY: 'secret',
        R2_BACKUP_BUCKET: 'jerzyfy-backups',
      }),
    ).toBeNull();
  });

  it('builds the Cloudflare endpoint from account id', () => {
    expect(resolveR2BackupConfig(full)).toEqual({
      endpoint: 'https://acct123.r2.cloudflarestorage.com',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      bucket: 'jerzyfy-backups',
    });
  });

  it('prefers R2_ENDPOINT override and allows omitting account id', () => {
    expect(
      resolveR2BackupConfig({
        R2_ENDPOINT: 'https://custom.example/r2',
        R2_ACCESS_KEY_ID: 'key',
        R2_SECRET_ACCESS_KEY: 'secret',
        R2_BACKUP_BUCKET: 'jerzyfy-backups',
      }),
    ).toEqual({
      endpoint: 'https://custom.example/r2',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      bucket: 'jerzyfy-backups',
    });
  });
});

describe('backupObjectKey / backupObjectPrefix', () => {
  it('nests under backups/{slug}/ with a sanitized slug', () => {
    expect(backupObjectPrefix('Demo Jersey Store!')).toBe('backups/Demo-Jersey-Store/');
    expect(backupObjectKey('Demo Jersey Store!', `jersey-Demo-Jersey-Store-2026${ENCRYPTED_BACKUP_EXTENSION}`)).toBe(
      `backups/Demo-Jersey-Store/jersey-Demo-Jersey-Store-2026${ENCRYPTED_BACKUP_EXTENSION}`,
    );
  });

  it('uses only the basename of the file name', () => {
    expect(backupObjectKey('jerzyfy', '/tmp/evil/jersey-jerzyfy-x.json.gz')).toBe(
      'backups/jerzyfy/jersey-jerzyfy-x.json.gz',
    );
  });
});
