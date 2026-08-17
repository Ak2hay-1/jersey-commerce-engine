import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupSchedulerService } from './backup-scheduler.service';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [BackupsController],
  providers: [BackupsService, BackupSchedulerService],
})
export class BackupsModule {}
