/**
 * Restores a Jerzyfy backup into an EMPTY database (after `prisma migrate deploy`).
 *
 * Usage:
 *   DATABASE_URL=... [BACKUP_ENCRYPTION_KEY=...] npm run backup:restore -w @jersey-commerce/api -- <backup file> [--confirm]
 *
 * Accepts .json, .json.gz, or .json.gz.enc. Without --confirm it only prints row counts (dry run).
 * Refuses to run when the shop already exists, so it can never overwrite live data.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { PrismaClient } from '../generated/prisma';
import { decryptBackup } from '../src/backups/backup-crypto';
import { BACKUP_TABLES } from '../src/backups/backup-exporter';

type Row = Record<string, unknown>;
type CreateManyDelegate = { createMany: (args: { data: Row[]; skipDuplicates?: boolean }) => Promise<{ count: number }> };

function loadPayload(file: string): { format: string; version: number; tenant: Row | null; data: Record<string, Row[]> } {
  let buffer: Buffer = readFileSync(file);
  if (file.endsWith('.enc')) {
    const key = (process.env.BACKUP_ENCRYPTION_KEY ?? '').trim();
    if (!key) {
      throw new Error('Set BACKUP_ENCRYPTION_KEY to restore an encrypted backup.');
    }
    buffer = decryptBackup(buffer, key);
  }
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    buffer = gunzipSync(buffer);
  }
  return JSON.parse(buffer.toString('utf8'));
}

/** Optional JSON columns reject a literal null in createMany; omitting the key stores NULL. */
function stripNulls(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null));
}

/** Parents before children for self-referencing tables (category tree). */
function parentsFirst(rows: Row[]): Row[] {
  if (!rows.some((row) => 'parentId' in row)) {
    return rows;
  }
  const placed = new Set<string>();
  const ordered: Row[] = [];
  let pending = rows;
  while (pending.length > 0) {
    const next: Row[] = [];
    for (const row of pending) {
      const parentId = row.parentId as string | null | undefined;
      if (!parentId || placed.has(parentId)) {
        ordered.push(row);
        placed.add(row.id as string);
      } else {
        next.push(row);
      }
    }
    if (next.length === pending.length) {
      throw new Error('Backup contains a category cycle or a missing parent.');
    }
    pending = next;
  }
  return ordered;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--'));
  const confirm = args.includes('--confirm');
  if (!file) {
    console.error('Usage: restore-backup <backup file> [--confirm]');
    process.exit(1);
  }
  const payload = loadPayload(file);
  if (payload.format !== 'jersey-commerce-backup' || !payload.tenant) {
    throw new Error('Not a Jerzyfy backup file.');
  }
  if (payload.version < 2) {
    console.warn('Version 1 backups only contain part of the shop data; restore will be incomplete.');
  }

  console.log(`Shop: ${String(payload.tenant.slug)} (${String(payload.tenant.id)})`);
  for (const [key] of BACKUP_TABLES) {
    console.log(`  ${key}: ${payload.data[key]?.length ?? 0}`);
  }
  console.log(`  auditLogs: ${payload.data.auditLogs?.length ?? 0}`);
  if (!confirm) {
    console.log('Dry run only. Re-run with --confirm to write to the database.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.tenant.findFirst({
      where: { OR: [{ id: payload.tenant.id as string }, { slug: payload.tenant.slug as string }] },
    });
    if (existing) {
      throw new Error('This shop already exists in the target database. Restore only into an empty database.');
    }
    await prisma.$transaction(
      async (tx) => {
        await tx.tenant.create({ data: stripNulls(payload.tenant!) as never });
        const db = tx as unknown as Record<string, CreateManyDelegate>;
        for (const [key, delegate] of [...BACKUP_TABLES, ['auditLogs', 'auditLog'] as const]) {
          const rows = payload.data[key] ?? [];
          if (rows.length === 0) {
            continue;
          }
          const ordered = parentsFirst(rows).map(stripNulls);
          for (let index = 0; index < ordered.length; index += 1000) {
            await db[delegate]!.createMany({ data: ordered.slice(index, index + 1000) });
          }
          console.log(`Restored ${key}: ${rows.length}`);
        }
      },
      { timeout: 30 * 60_000, maxWait: 30_000 },
    );
    console.log('Restore complete. Rotate staff passwords and JWT secrets if the backup left your control.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
