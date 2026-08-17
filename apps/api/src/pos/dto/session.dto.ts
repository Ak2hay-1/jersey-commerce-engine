import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) {
    return value;
  }
  return typeof value === 'string' ? value : String(value);
};

export class OpenPosSessionDto {
  @ApiProperty({ example: '5000.00', description: 'Opening float. Not treated as sales revenue.' })
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'openingCash cannot be negative and must have at most 2 decimal places.' })
  openingCash!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ClosePosSessionDto {
  @ApiProperty({ example: '23000.00' })
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'closingCash cannot be negative and must have at most 2 decimal places.' })
  closingCash!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
