import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdatePaymentSettingsDto {
  @ApiProperty()
  @IsBoolean()
  razorpayEnabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  razorpayKeyId?: string | null;

  @ApiPropertyOptional({ description: 'Leave blank to keep the existing secret. Send null to clear.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(512)
  razorpayKeySecret?: string | null;
}
