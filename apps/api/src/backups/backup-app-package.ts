import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  APP_BACKUP_EXTENSION,
  ENCRYPTED_APP_BACKUP_EXTENSION,
  encryptBackupFile,
} from './backup-crypto';
import { dumpPostgresDatabase } from './backup-database-dump';
import { archiveUploadsRoot } from './backup-uploads-archive';

export const APP_BACKUP_FORMAT = 'jersey-commerce-app-backup';
export const APP_BACKUP_VERSION = 1;

export interface AppBackupManifest {
  format: typeof APP_BACKUP_FORMAT;
  version: typeof APP_BACKUP_VERSION;
  generatedAt: string;
  tenantSlug: string;
  database: string;
  contents: ['manifest.json', 'database.dump', 'uploads.tar.gz'];
}

export function appBackupFileName(slug: string, at: Date, encrypted: boolean): string {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'tenant';
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  return `jersey-${safeSlug}-${stamp}${encrypted ? ENCRYPTED_APP_BACKUP_EXTENSION : APP_BACKUP_EXTENSION}`;
}

export function buildAppBackupManifest(input: {
  generatedAt: Date;
  tenantSlug: string;
  database: string;
}): AppBackupManifest {
  return {
    format: APP_BACKUP_FORMAT,
    version: APP_BACKUP_VERSION,
    generatedAt: input.generatedAt.toISOString(),
    tenantSlug: input.tenantSlug,
    database: input.database,
    contents: ['manifest.json', 'database.dump', 'uploads.tar.gz'],
  };
}

async function tarGzipDirectory(sourceDir: string, outputPath: string, entries: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('tar', ['-czf', outputPath, '-C', sourceDir, ...entries], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const stderrChunks: Buffer[] = [];
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.on('error', (error) => {
      reject(new Error(`Failed to start tar (${error.message}).`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
      reject(new Error(`tar exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
    });
  });
}

async function rmrf(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
}

export interface BuildFullAppBackupInput {
  databaseUrl: string;
  uploadsRoot: string;
  tenantSlug: string;
  destinationPath: string;
  encryptionKey: string | null;
  generatedAt?: Date;
}

export interface BuildFullAppBackupResult {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  manifest: AppBackupManifest;
}

/**
 * Build an encrypted (or plain) full-app backup package:
 * manifest.json + database.dump + uploads.tar.gz inside a .app.tar.gz[.enc].
 */
export async function buildFullAppBackup(input: BuildFullAppBackupInput): Promise<BuildFullAppBackupResult> {
  const generatedAt = input.generatedAt ?? new Date();
  const encrypted = Boolean(input.encryptionKey);
  const fileName = appBackupFileName(input.tenantSlug, generatedAt, encrypted);
  const filePath = path.join(input.destinationPath, fileName);
  const partialPath = `${filePath}.partial`;
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jerzyfy-backup-'));

  try {
    const dumpPath = path.join(workDir, 'database.dump');
    const uploadsPath = path.join(workDir, 'uploads.tar.gz');
    const packagePlainPath = path.join(workDir, 'package.app.tar.gz');

    const conn = await dumpPostgresDatabase(input.databaseUrl, dumpPath);
    await archiveUploadsRoot(input.uploadsRoot, uploadsPath);

    const manifest = buildAppBackupManifest({
      generatedAt,
      tenantSlug: input.tenantSlug,
      database: conn.database,
    });
    await fs.writeFile(path.join(workDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
      mode: 0o600,
    });

    await tarGzipDirectory(workDir, packagePlainPath, [
      'manifest.json',
      'database.dump',
      'uploads.tar.gz',
    ]);

    await fs.mkdir(input.destinationPath, { recursive: true });
    if (input.encryptionKey) {
      await encryptBackupFile(packagePlainPath, partialPath, input.encryptionKey);
    } else {
      await fs.copyFile(packagePlainPath, partialPath);
      await fs.chmod(partialPath, 0o600).catch(() => undefined);
    }
    await fs.rename(partialPath, filePath);

    const stats = await fs.stat(filePath);
    return {
      fileName,
      filePath,
      fileSizeBytes: stats.size,
      manifest,
    };
  } catch (error) {
    await fs.unlink(partialPath).catch(() => undefined);
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  } finally {
    await rmrf(workDir);
  }
}
