import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import path from 'node:path';
import { ENCRYPTED_BACKUP_EXTENSION } from './backup-crypto';

export interface R2BackupConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface R2BackupEnv {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BACKUP_BUCKET?: string;
  R2_ENDPOINT?: string;
}

function safeTenantSlug(tenantSlug: string): string {
  return tenantSlug.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'tenant';
}

export function resolveR2BackupConfig(env: R2BackupEnv): R2BackupConfig | null {
  const accountId = env.R2_ACCOUNT_ID?.trim() ?? '';
  const endpointOverride = env.R2_ENDPOINT?.trim() ?? '';
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  const bucket = env.R2_BACKUP_BUCKET?.trim() ?? '';
  const endpoint =
    endpointOverride || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }
  return { endpoint, accessKeyId, secretAccessKey, bucket };
}

export function backupObjectKey(tenantSlug: string, fileName: string): string {
  const safeSlug = safeTenantSlug(tenantSlug);
  const safeName = path.basename(fileName).replace(/[/\\]/g, '') || 'backup.bin';
  return `backups/${safeSlug}/${safeName}`;
}

export function backupObjectPrefix(tenantSlug: string): string {
  return `backups/${safeTenantSlug(tenantSlug)}/`;
}

function isBackupObjectName(name: string, slugPrefix: string): boolean {
  return (
    name.startsWith(slugPrefix) &&
    (name.endsWith('.json.gz') || name.endsWith(ENCRYPTED_BACKUP_EXTENSION))
  );
}

export function createR2BackupClient(config: R2BackupConfig): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function putBackupObject(
  client: S3Client,
  config: R2BackupConfig,
  key: string,
  body: Buffer,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/octet-stream',
    }),
  );
}

export async function listBackupObjects(
  client: S3Client,
  config: R2BackupConfig,
  tenantSlug: string,
): Promise<Array<{ key: string; lastModifiedMs: number }>> {
  const prefix = backupObjectPrefix(tenantSlug);
  const filePrefix = `jersey-${safeTenantSlug(tenantSlug)}-`;
  const collected: Array<{ key: string; lastModifiedMs: number }> = [];
  let continuationToken: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of page.Contents ?? []) {
      const key = obj.Key;
      if (!key) {
        continue;
      }
      const fileName = key.slice(prefix.length);
      if (!isBackupObjectName(fileName, filePrefix)) {
        continue;
      }
      collected.push({
        key,
        lastModifiedMs: obj.LastModified?.getTime() ?? 0,
      });
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return collected;
}

export async function deleteBackupObject(
  client: S3Client,
  config: R2BackupConfig,
  key: string,
): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export async function pruneR2Backups(
  client: S3Client,
  config: R2BackupConfig,
  tenantSlug: string,
  retainCopies: number,
): Promise<void> {
  const objects = await listBackupObjects(client, config, tenantSlug);
  objects.sort((a, b) => b.lastModifiedMs - a.lastModifiedMs);
  const extra = objects.slice(Math.max(0, retainCopies));
  await Promise.all(extra.map((obj) => deleteBackupObject(client, config, obj.key)));
}
