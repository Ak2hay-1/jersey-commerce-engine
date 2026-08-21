import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { EMAIL_OTP_PROVIDERS, SMS_OTP_PROVIDERS, type EmailOtpProvider, type SmsOtpProvider } from '@jersey-commerce/types';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return '';
  }
  return typeof value === 'string' ? value.trim() : value;
};

export class UpdateAuthSettingsDto {
  @ApiProperty()
  @Type(() => Boolean)
  @IsBoolean()
  passwordLoginEnabled!: boolean;

  @ApiProperty()
  @Type(() => Boolean)
  @IsBoolean()
  emailOtpEnabled!: boolean;

  @ApiProperty()
  @Type(() => Boolean)
  @IsBoolean()
  smsOtpEnabled!: boolean;

  @ApiProperty()
  @Type(() => Boolean)
  @IsBoolean()
  googleSignInEnabled!: boolean;

  @ApiProperty({ enum: EMAIL_OTP_PROVIDERS })
  @IsEnum(EMAIL_OTP_PROVIDERS)
  emailProvider!: EmailOtpProvider;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsEmail()
  @MaxLength(320)
  emailFromAddress?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(120)
  emailFromName?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Omit or send empty to keep. null clears.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(512)
  resendApiKey?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(255)
  smtpHost?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(320)
  smtpUser?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(512)
  smtpPassword?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiProperty({ enum: SMS_OTP_PROVIDERS })
  @IsEnum(SMS_OTP_PROVIDERS)
  smsProvider!: SmsOtpProvider;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(512)
  smsApiKey?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(32)
  smsSenderId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(64)
  twilioAccountSid?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(512)
  twilioAuthToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(32)
  smsFromNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToUndefined)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(255)
  googleClientId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(512)
  googleClientSecret?: string | null;

  @ApiPropertyOptional({ minimum: 60, maximum: 900 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(900)
  otpTtlSeconds?: number;
}

export class TestEmailDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(320)
  to!: string;
}

export class TestSmsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(32)
  to!: string;
}
