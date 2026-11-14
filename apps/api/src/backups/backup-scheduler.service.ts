import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupsService } from './backups.service';

@Injectable()
export class BackupSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BackupSchedulerService.name);

  constructor(private readonly backups: BackupsService) {}

  async onModuleInit(): Promise<void> {
    try {
      const enabled = await this.backups.ensureAutoEnabledDailyBackups();
      if (enabled > 0) {
        this.logger.log(`Auto-enabled daily R2 backups for ${enabled} shop(s).`);
      }
    } catch (error) {
      this.logger.warn(
        `Backup auto-enable skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async tick(): Promise<void> {
    await this.backups.recoverStaleRuns();
    const tenantIds = await this.backups.findDueTenantIds();
    for (const tenantId of tenantIds) {
      try {
        await this.backups.runBackup(tenantId, 'SCHEDULED');
      } catch (error) {
        this.logger.error(
          `Scheduled backup failed for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
