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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional({ description: 'MSG91 auth key. Leave blank to keep the existing key. Send null to clear.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(256)
  msg91AuthKey?: string | null;

  @ApiPropertyOptional({ description: 'MSG91 WhatsApp integrated number with country code, e.g. 919876543210' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(20)
  whatsappIntegratedNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  whatsappTemplateName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  whatsappTemplateNamespace?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  whatsappTemplateLanguage?: string;

  @ApiPropertyOptional({ description: 'Public API base URL MSG91 downloads invoice PDFs from' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(300)
  whatsappPublicBaseUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappSendPosReceipt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappSendOrderReceipt?: boolean;
}

export class WhatsappTestDto {
  @ApiProperty({ description: 'Recipient phone (10 digits or with 91)' })
  @IsString()
  @MaxLength(20)
  phone!: string;
}

export class WhatsappSendReceiptDto {
  @ApiPropertyOptional({ description: 'Override recipient phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
