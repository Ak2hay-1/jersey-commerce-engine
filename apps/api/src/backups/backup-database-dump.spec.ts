import { parseDatabaseUrl } from './backup-database-dump';

describe('parseDatabaseUrl', () => {
  it('parses a Prisma-style postgresql URL', () => {
    expect(
      parseDatabaseUrl(
        'postgresql://jersey:s3cret%21@postgres:5432/jersey_commerce?schema=public&connection_limit=10',
      ),
    ).toEqual({
      host: 'postgres',
      port: '5432',
      user: 'jersey',
      password: 's3cret!',
      database: 'jersey_commerce',
    });
  });

  it('defaults the port and accepts postgres://', () => {
    expect(parseDatabaseUrl('postgres://user:pass@dbhost/mydb')).toEqual({
      host: 'dbhost',
      port: '5432',
      user: 'user',
      password: 'pass',
      database: 'mydb',
    });
  });

  it('rejects missing database name or wrong protocol', () => {
    expect(() => parseDatabaseUrl('postgresql://user:pass@localhost/')).toThrow(/database name/);
    expect(() => parseDatabaseUrl('mysql://user:pass@localhost/db')).toThrow(/postgresql/);
    expect(() => parseDatabaseUrl('')).toThrow(/empty/);
  });
});
