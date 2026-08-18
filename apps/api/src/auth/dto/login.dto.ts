import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'DevPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    description: 'Optional tenant slug used only to disambiguate login, never for later authorization.',
    example: 'demo-jersey-store',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  tenantSlug?: string;
}
