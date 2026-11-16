import {
  APP_BACKUP_FORMAT,
  APP_BACKUP_VERSION,
  appBackupFileName,
  buildAppBackupManifest,
} from './backup-app-package';
import {
  APP_BACKUP_EXTENSION,
  ENCRYPTED_APP_BACKUP_EXTENSION,
  isBackupArtifactName,
} from './backup-crypto';

describe('appBackupFileName / manifest', () => {
  const at = new Date('2026-01-02T03:04:05.000Z');

  it('names encrypted and plain full-app archives', () => {
    expect(appBackupFileName('demo-jersey-store', at, true)).toBe(
      `jersey-demo-jersey-store-2026-01-02T03-04-05-000Z${ENCRYPTED_APP_BACKUP_EXTENSION}`,
    );
    expect(appBackupFileName('demo-jersey-store', at, false)).toBe(
      `jersey-demo-jersey-store-2026-01-02T03-04-05-000Z${APP_BACKUP_EXTENSION}`,
    );
  });

  it('builds a stable crash-recovery manifest', () => {
    expect(
      buildAppBackupManifest({
        generatedAt: at,
        tenantSlug: 'demo-jersey-store',
        database: 'jersey_commerce',
      }),
    ).toEqual({
      format: APP_BACKUP_FORMAT,
      version: APP_BACKUP_VERSION,
      generatedAt: '2026-01-02T03:04:05.000Z',
      tenantSlug: 'demo-jersey-store',
      database: 'jersey_commerce',
      contents: ['manifest.json', 'database.dump', 'uploads.tar.gz'],
    });
  });

  it('recognizes full-app and legacy backup artifact names for pruning', () => {
    expect(isBackupArtifactName('jersey-demo-x.app.tar.gz.enc')).toBe(true);
    expect(isBackupArtifactName('jersey-demo-x.app.tar.gz')).toBe(true);
    expect(isBackupArtifactName('jersey-demo-x.json.gz.enc')).toBe(true);
    expect(isBackupArtifactName('jersey-demo-x.json.gz')).toBe(true);
    expect(isBackupArtifactName('jersey-demo-x.partial')).toBe(false);
  });
});
