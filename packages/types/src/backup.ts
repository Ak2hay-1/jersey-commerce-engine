import type { BackupIntervalUnit, BackupRunStatus, BackupRunTrigger } from './enums';

export interface BackupSettings {
  id: string | null;
  tenantId: string;
  enabled: boolean;
  destinationPath: string;
  scheduleTime: string;
  intervalValue: number;
  intervalUnit: BackupIntervalUnit;
  retainCopies: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackupRun {
  id: string;
  tenantId: string;
  trigger: BackupRunTrigger;
  status: BackupRunStatus;
  fileName: string | null;
  filePath: string | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}

export interface UpdateBackupSettingsInput {
  enabled: boolean;
  destinationPath: string;
  scheduleTime: string;
  intervalValue: number;
  intervalUnit: BackupIntervalUnit;
  retainCopies?: number;
}
