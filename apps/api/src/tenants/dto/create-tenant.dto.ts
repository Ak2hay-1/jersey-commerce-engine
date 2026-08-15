import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PASSWORD_STRENGTH_MESSAGE, PASSWORD_STRENGTH_REGEX } from '../../auth/dto/change-password.dto';

export class CreateTenantDto {
  @ApiProperty({ example: 'Demo Jersey Store' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'demo-jersey-store' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MinLength(2)
  @MaxLength(64)
  slug!: string;

  @ApiProperty({ example: 'owner@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_STRENGTH_REGEX, { message: PASSWORD_STRENGTH_MESSAGE })
  ownerPassword!: string;

  @ApiProperty({ example: 'Store Owner' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  ownerName!: string;
}
