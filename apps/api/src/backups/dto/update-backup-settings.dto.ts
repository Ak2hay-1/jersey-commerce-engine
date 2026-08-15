import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BACKUP_INTERVAL_UNITS, type BackupIntervalUnit } from '@jersey-commerce/types';

function toScheduleTime(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const match = /^(\d{1,2}):([0-5]\d)/.exec(value.trim());
  if (!match) {
    return value.trim();
  }
  const hour = match[1];
  const minute = match[2];
  if (!hour || !minute) {
    return value.trim();
  }
  return `${hour.padStart(2, '0')}:${minute}`;
}

export class UpdateBackupSettingsDto {
  @ApiProperty({ description: 'Turn automatic backups on or off' })
  @Type(() => Boolean)
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({
    description: 'Absolute folder path on the API server where backup files are written',
    example: 'C:\\\\Backups\\\\jersey-store',
  })
  @IsString()
  @MaxLength(1024)
  destinationPath!: string;

  @ApiProperty({
    description: 'Local time of day (HH:mm) when backups should run',
    example: '02:00',
  })
  @Transform(({ value }) => toScheduleTime(value))
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Schedule time must be HH:mm in 24-hour format.' })
  scheduleTime!: string;

  @ApiProperty({ description: 'How often backups repeat', example: 1, minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  intervalValue!: number;

  @ApiProperty({ enum: BACKUP_INTERVAL_UNITS, example: 'DAYS' })
  @IsEnum(BACKUP_INTERVAL_UNITS)
  intervalUnit!: BackupIntervalUnit;

  @ApiPropertyOptional({ description: 'How many backup files to keep', default: 14, minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  retainCopies?: number;
}
