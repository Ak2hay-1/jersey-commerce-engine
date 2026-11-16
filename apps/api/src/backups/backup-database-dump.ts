import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface ParsedDatabaseUrl {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

/**
 * Parse a Prisma/Postgres DATABASE_URL into pg_dump connection fields.
 * Supports postgresql:// and postgres:// URLs (query string ignored).
 */
export function parseDatabaseUrl(databaseUrl: string): ParsedDatabaseUrl {
  const trimmed = databaseUrl.trim();
  if (!trimmed) {
    throw new Error('DATABASE_URL is empty.');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(`DATABASE_URL must use postgresql:// (got ${parsed.protocol}).`);
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0] ?? '').trim();
  if (!database) {
    throw new Error('DATABASE_URL is missing the database name.');
  }
  const user = decodeURIComponent(parsed.username || '');
  if (!user) {
    throw new Error('DATABASE_URL is missing the database user.');
  }
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port || '5432',
    user,
    password: decodeURIComponent(parsed.password || ''),
    database,
  };
}

/**
 * Run `pg_dump -Fc` to `outputPath`. Requires the postgresql client on PATH.
 */
export async function dumpPostgresDatabase(
  databaseUrl: string,
  outputPath: string,
): Promise<ParsedDatabaseUrl> {
  const conn = parseDatabaseUrl(databaseUrl);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'pg_dump',
      ['-Fc', '-h', conn.host, '-p', conn.port, '-U', conn.user, '-d', conn.database, '-f', outputPath],
      {
        env: { ...process.env, PGPASSWORD: conn.password },
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );
    const stderrChunks: Buffer[] = [];
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.on('error', (error) => {
      reject(
        new Error(
          `Failed to start pg_dump (${error.message}). Install postgresql-client in the API image.`,
        ),
      );
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
      reject(new Error(`pg_dump exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
    });
  });

  const stats = await fs.stat(outputPath);
  if (stats.size <= 0) {
    throw new Error('pg_dump produced an empty dump file.');
  }
  return conn;
}
