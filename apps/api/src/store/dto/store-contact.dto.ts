import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return typeof value === 'string' ? value.trim() : value;
};

export class StoreContactMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;
}
