import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiProperty()
  @IsBoolean()
  telegramEnabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(64)
  telegramChatId?: string | null;

  @ApiPropertyOptional({ description: 'Leave blank to keep the existing token. Send null to clear.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(256)
  telegramBotToken?: string | null;

  @ApiProperty()
  @IsBoolean()
  notifyOrderCreated!: boolean;

  @ApiProperty()
  @IsBoolean()
  notifyCustomOrderCreated!: boolean;

  @ApiProperty()
  @IsBoolean()
  notifyPaymentConfirmed!: boolean;

  @ApiProperty()
  @IsBoolean()
  notifyOrderStatusChanged!: boolean;

  @ApiProperty()
  @IsBoolean()
  notifyPosSale!: boolean;
}
