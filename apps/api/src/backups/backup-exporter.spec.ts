import { BACKUP_TABLES, backupFileName } from './backup-exporter';
import { TENANT_SCOPED_MODELS } from '../prisma/tenant-extension';

const INTENTIONALLY_EXCLUDED = new Set(['RefreshToken', 'PasswordResetToken', 'CheckoutIdempotency', 'AuditLog']);

function delegateFor(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

describe('backup exporter', () => {
  it('backs up every shop-scoped table except short-lived security rows', () => {
    const exported = new Set<string>(BACKUP_TABLES.map(([, delegate]) => delegate));
    const missing = [...TENANT_SCOPED_MODELS]
      .filter((model) => !INTENTIONALLY_EXCLUDED.has(model))
      .filter((model) => !exported.has(delegateFor(model)));
    expect(missing).toEqual([]);
  });

  it('never exports refresh or password-reset tokens', () => {
    const exported: string[] = BACKUP_TABLES.map(([, delegate]) => delegate);
    expect(exported).not.toContain('refreshToken');
    expect(exported).not.toContain('passwordResetToken');
  });

  it('uses unique keys per table', () => {
    const keys = BACKUP_TABLES.map(([key]) => key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('builds a safe file name', () => {
    const at = new Date('2026-10-10T05:00:00.000Z');
    expect(backupFileName('demo-jersey-store', at)).toBe('jersey-demo-jersey-store-2026-10-10T05-00-00-000Z.json.gz');
    expect(backupFileName('../../etc', at, true)).toBe('jersey-etc-2026-10-10T05-00-00-000Z.json.gz.enc');
  });
});
