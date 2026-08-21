import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupsService } from './backups.service';

@Injectable()
export class BackupSchedulerService {
  private readonly logger = new Logger(BackupSchedulerService.name);

  constructor(private readonly backups: BackupsService) {}

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
