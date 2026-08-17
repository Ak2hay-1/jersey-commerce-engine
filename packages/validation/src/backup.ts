import { z } from 'zod';

export const BACKUP_INTERVAL_UNITS = ['HOURS', 'DAYS', 'WEEKS', 'MONTHS'] as const;

export const scheduleTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Schedule time must be HH:mm in 24-hour format.');

export const updateBackupSettingsSchema = z.object({
  enabled: z.boolean(),
  destinationPath: z.string().trim().max(1024),
  scheduleTime: scheduleTimeSchema,
  intervalValue: z.number().int().min(1).max(365),
  intervalUnit: z.enum(BACKUP_INTERVAL_UNITS),
  retainCopies: z.number().int().min(1).max(365).optional(),
});

export type UpdateBackupSettingsInput = z.infer<typeof updateBackupSettingsSchema>;
