import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ServerEnv } from '@jersey-commerce/config';
import type { BackupRun, BackupRunTrigger, BackupSettings } from '@jersey-commerce/types';
import type { BackupRun as BackupRunRecord, BackupSettings as BackupSettingsRecord } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import {
  toPaginationArgs,
  toPaginationMeta,
  type PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { backupFileName, buildTenantBackupPayload, compressBackupPayload } from './backup-exporter';
import { assertSafeBackupPath } from './backup-path';
import { computeNextRunAt, DEFAULT_SCHEDULE_TIME } from './backup-schedule';
import type { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto';

const STALE_RUN_MS = 2 * 60 * 60 * 1000;
const inFlight = new Set<string>();

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function mapSettings(row: BackupSettingsRecord, tenantId: string): BackupSettings {
  return {
    id: row.id,
    tenantId,
    enabled: row.enabled,
    destinationPath: row.destinationPath,
    scheduleTime: row.scheduleTime,
    intervalValue: row.intervalValue,
    intervalUnit: row.intervalUnit,
    retainCopies: row.retainCopies,
    lastRunAt: toIso(row.lastRunAt),
    nextRunAt: toIso(row.nextRunAt),
    lastError: row.lastError,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapRun(row: BackupRunRecord): BackupRun {
  return {
    id: row.id,
    tenantId: row.tenantId,
    trigger: row.trigger,
    status: row.status,
    fileName: row.fileName,
    filePath: row.filePath,
    fileSizeBytes: row.fileSizeBytes,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt.toISOString(),
    finishedAt: toIso(row.finishedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

function defaultSettings(tenantId: string): BackupSettings {
  return {
    id: null,
    tenantId,
    enabled: false,
    destinationPath: '',
    scheduleTime: DEFAULT_SCHEDULE_TIME,
    intervalValue: 1,
    intervalUnit: 'DAYS',
    retainCopies: 14,
    lastRunAt: null,
    nextRunAt: null,
    lastError: null,
    createdAt: null,
    updatedAt: null,
  };
}

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ServerEnv, true>,
  ) {}

  async getSettings(tenantId: string): Promise<BackupSettings> {
    const row = await this.prisma.backupSettings.findUnique({ where: { tenantId } });
    return row ? mapSettings(row, tenantId) : defaultSettings(tenantId);
  }

  async updateSettings(tenantId: string, dto: UpdateBackupSettingsDto): Promise<BackupSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, timezone: true },
    });
    if (!tenant) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Tenant not found.' });
    }

    const destinationPath = dto.enabled
      ? assertSafeBackupPath(dto.destinationPath, this.allowedRoot())
      : dto.destinationPath.trim();
    if (dto.enabled) {
      try {
        await fs.mkdir(destinationPath, { recursive: true });
      } catch (error) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: `Cannot write to backup path: ${error instanceof Error ? error.message : 'unknown error'}`,
        });
      }
    }
    const retainCopies = dto.retainCopies ?? 14;
    const existing = await this.prisma.backupSettings.findUnique({ where: { tenantId } });
    const nextRunAt = dto.enabled
      ? computeNextRunAt({
          now: new Date(),
          lastRunAt: existing?.lastRunAt ?? null,
          scheduleTime: dto.scheduleTime,
          intervalValue: dto.intervalValue,
          intervalUnit: dto.intervalUnit,
          timeZone: tenant.timezone,
        })
      : null;

    const row = await this.prisma.backupSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        enabled: dto.enabled,
        destinationPath,
        scheduleTime: dto.scheduleTime,
        intervalValue: dto.intervalValue,
        intervalUnit: dto.intervalUnit,
        retainCopies,
        nextRunAt,
        lastError: null,
      },
      update: {
        enabled: dto.enabled,
        destinationPath,
        scheduleTime: dto.scheduleTime,
        intervalValue: dto.intervalValue,
        intervalUnit: dto.intervalUnit,
        retainCopies,
        nextRunAt,
        lastError: dto.enabled ? undefined : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: AUDIT_ACTIONS.BACKUP_SETTINGS_UPDATED,
        entity: 'BackupSettings',
        entityId: row.id,
        newValue: {
          enabled: row.enabled,
          destinationPath: row.destinationPath,
          scheduleTime: row.scheduleTime,
          intervalValue: row.intervalValue,
          intervalUnit: row.intervalUnit,
          retainCopies: row.retainCopies,
          nextRunAt: toIso(row.nextRunAt),
        },
      },
    });

    return mapSettings(row, tenantId);
  }

  async findRuns(tenantId: string, query: PaginationQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = { tenantId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.backupRun.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.backupRun.count({ where }),
    ]);
    return { items: items.map(mapRun), meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findDueTenantIds(now = new Date()): Promise<string[]> {
    const rows = await this.prisma.backupSettings.findMany({
      where: { enabled: true, nextRunAt: { lte: now } },
      select: { tenantId: true },
    });
    return rows.map((row) => row.tenantId);
  }

  async recoverStaleRuns(now = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - STALE_RUN_MS);
    await this.prisma.backupRun.updateMany({
      where: { status: 'RUNNING', startedAt: { lte: cutoff } },
      data: {
        status: 'FAILED',
        errorMessage: 'Backup did not finish before the stale-run timeout.',
        finishedAt: now,
      },
    });
  }

  async runBackup(tenantId: string, trigger: BackupRunTrigger): Promise<BackupRun> {
    if (inFlight.has(tenantId)) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'A backup is already running for this tenant.',
      });
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, timezone: true },
    });
    if (!tenant) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Tenant not found.' });
    }

    const settings = await this.ensureSettings(tenantId);
    if (!settings.destinationPath.trim()) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Set a backup folder path before running a backup.',
      });
    }
    const destinationPath = assertSafeBackupPath(settings.destinationPath, this.allowedRoot());
    const active = await this.prisma.backupRun.findFirst({
      where: { tenantId, status: 'RUNNING' },
      orderBy: { startedAt: 'desc' },
    });
    if (active) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'A backup is already running for this tenant.',
      });
    }

    inFlight.add(tenantId);
    const run = await this.prisma.backupRun.create({
      data: {
        tenantId,
        settingsId: settings.id,
        trigger,
        status: 'RUNNING',
      },
    });

    try {
      await fs.mkdir(destinationPath, { recursive: true });
      const payload = await buildTenantBackupPayload(this.prisma, tenantId);
      const compressed = compressBackupPayload(payload);
      const fileName = backupFileName(tenant.slug, new Date());
      const filePath = path.join(destinationPath, fileName);
      await fs.writeFile(filePath, compressed);

      const finishedAt = new Date();
      const nextRunAt = settings.enabled
        ? computeNextRunAt({
            now: finishedAt,
            lastRunAt: finishedAt,
            scheduleTime: settings.scheduleTime,
            intervalValue: settings.intervalValue,
            intervalUnit: settings.intervalUnit,
            timeZone: tenant.timezone,
          })
        : settings.nextRunAt;

      const [updated] = await this.prisma.$transaction([
        this.prisma.backupRun.update({
          where: { id: run.id },
          data: {
            status: 'SUCCESS',
            fileName,
            filePath,
            fileSizeBytes: compressed.byteLength,
            finishedAt,
          },
        }),
        this.prisma.backupSettings.update({
          where: { id: settings.id },
          data: { lastRunAt: finishedAt, nextRunAt, lastError: null },
        }),
        this.prisma.auditLog.create({
          data: {
            tenantId,
            action: AUDIT_ACTIONS.BACKUP_RUN_COMPLETED,
            entity: 'BackupRun',
            entityId: run.id,
            newValue: { trigger, fileName, filePath, fileSizeBytes: compressed.byteLength },
          },
        }),
      ]);

      await this.pruneOldBackups(destinationPath, tenant.slug, settings.retainCopies);
      return mapRun(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Backup failed.';
      this.logger.error(`Backup failed for tenant ${tenantId}: ${message}`);
      const finishedAt = new Date();
      const failed = await this.prisma.backupRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', errorMessage: message, finishedAt },
      });
      await this.prisma.backupSettings.update({
        where: { id: settings.id },
        data: { lastError: message, lastRunAt: finishedAt },
      });
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action: AUDIT_ACTIONS.BACKUP_RUN_FAILED,
          entity: 'BackupRun',
          entityId: run.id,
          newValue: { trigger, error: message },
        },
      });
      if (trigger === 'MANUAL') {
        throw new BadRequestException({ code: 'BAD_REQUEST', message });
      }
      return mapRun(failed);
    } finally {
      inFlight.delete(tenantId);
    }
  }

  private allowedRoot(): string {
    return this.config.get('BACKUP_ALLOWED_ROOT', { infer: true }) ?? '';
  }

  private async ensureSettings(tenantId: string): Promise<BackupSettingsRecord> {
    const existing = await this.prisma.backupSettings.findUnique({ where: { tenantId } });
    if (existing) {
      return existing;
    }
    return this.prisma.backupSettings.create({
      data: { tenantId, scheduleTime: DEFAULT_SCHEDULE_TIME },
    });
  }

  private async pruneOldBackups(destinationPath: string, slug: string, retainCopies: number): Promise<void> {
    const safeSlug = slug.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'tenant';
    const prefix = `jersey-${safeSlug}-`;
    try {
      const names = await fs.readdir(destinationPath);
      const files = names
        .filter((name) => name.startsWith(prefix) && name.endsWith('.json.gz'))
        .map((name) => ({ name, fullPath: path.join(destinationPath, name) }));
      const withStats = await Promise.all(
        files.map(async (file) => {
          const stats = await fs.stat(file.fullPath);
          return { ...file, mtime: stats.mtimeMs };
        }),
      );
      withStats.sort((a, b) => b.mtime - a.mtime);
      const extra = withStats.slice(retainCopies);
      await Promise.all(extra.map((file) => fs.unlink(file.fullPath).catch(() => undefined)));
    } catch (error) {
      this.logger.warn(
        `Could not prune backups in ${destinationPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
