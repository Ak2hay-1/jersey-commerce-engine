import { assertProductionSecurityConfig, evaluateProductionConfig } from './assert-production-config';

const strong = (seed: string) => `${seed}-7f3c9a1b2d4e6f8091a2b3c4d5e6f7a8b9c0`;

const safeEnv = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: strong('access'),
  JWT_REFRESH_SECRET: strong('refresh'),
  CORS_ORIGINS: 'https://shop.jerzyfy.com,https://admin.jerzyfy.com',
  COOKIE_SECURE: 'true',
  COOKIE_SAMESITE: 'none',
  SECRETS_ENCRYPTION_KEY: strong('secrets'),
  BACKUP_ENCRYPTION_KEY: strong('backup'),
  R2_ACCOUNT_ID: 'acct123',
  R2_ACCESS_KEY_ID: 'r2access',
  R2_SECRET_ACCESS_KEY: 'r2secret',
  R2_BACKUP_BUCKET: 'jerzyfy-backups',
};

describe('evaluateProductionConfig', () => {
  it('skips checks outside production', () => {
    expect(evaluateProductionConfig({ NODE_ENV: 'development' })).toEqual({ errors: [], warnings: [] });
  });

  it('accepts a safe production config', () => {
    expect(evaluateProductionConfig(safeEnv)).toEqual({ errors: [], warnings: [] });
  });

  it('rejects missing, short, placeholder and identical JWT secrets', () => {
    expect(evaluateProductionConfig({ ...safeEnv, JWT_ACCESS_SECRET: undefined }).errors).toContain(
      'JWT_ACCESS_SECRET is required in production.',
    );
    expect(evaluateProductionConfig({ ...safeEnv, JWT_ACCESS_SECRET: 'short' }).errors[0]).toMatch(/at least 32/);
    expect(
      evaluateProductionConfig({ ...safeEnv, JWT_REFRESH_SECRET: 'replace-with-a-long-random-refresh-secret-32ch' })
        .errors[0],
    ).toMatch(/placeholder/);
    expect(
      evaluateProductionConfig({ ...safeEnv, JWT_REFRESH_SECRET: safeEnv.JWT_ACCESS_SECRET }).errors,
    ).toContain('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
  });

  it('rejects wildcard CORS and SameSite=none without Secure', () => {
    expect(evaluateProductionConfig({ ...safeEnv, CORS_ORIGINS: '*' }).errors[0]).toMatch(/CORS_ORIGINS/);
    expect(evaluateProductionConfig({ ...safeEnv, COOKIE_SECURE: 'false' }).errors).toContain(
      'COOKIE_SAMESITE=none requires COOKIE_SECURE=true.',
    );
  });

  it('warns rather than fails for missing optional keys and insecure lax cookies', () => {
    const report = evaluateProductionConfig({
      ...safeEnv,
      COOKIE_SECURE: 'false',
      COOKIE_SAMESITE: 'lax',
      SECRETS_ENCRYPTION_KEY: '',
      BACKUP_ENCRYPTION_KEY: '',
    });
    expect(report.errors).toEqual([]);
    expect(report.warnings).toHaveLength(3);
  });

  it('warns when backup encryption is set but R2 offsite env is incomplete', () => {
    const report = evaluateProductionConfig({
      ...safeEnv,
      R2_ACCOUNT_ID: '',
      R2_ACCESS_KEY_ID: '',
      R2_SECRET_ACCESS_KEY: '',
      R2_BACKUP_BUCKET: '',
    });
    expect(report.errors).toEqual([]);
    expect(report.warnings.some((w) => w.includes('R2 backup env is incomplete'))).toBe(true);
  });

  it('rejects short optional secrets when set', () => {
    expect(evaluateProductionConfig({ ...safeEnv, BOOTSTRAP_SECRET: 'tiny' }).errors[0]).toMatch(/BOOTSTRAP_SECRET/);
  });
});

describe('assertProductionSecurityConfig', () => {
  it('throws with all errors listed', () => {
    expect(() => assertProductionSecurityConfig({ NODE_ENV: 'production' }, () => undefined)).toThrow(
      /JWT_ACCESS_SECRET[\s\S]*JWT_REFRESH_SECRET/,
    );
  });
});
