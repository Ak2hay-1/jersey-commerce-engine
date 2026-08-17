import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, NotEquals } from 'class-validator';

export class AdjustInventoryDto {
  @ApiProperty({ example: 'clxyzvariant' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  productVariantId!: string;

  @ApiProperty({ example: 10, description: 'Signed quantity. Positive adds stock, negative removes stock.' })
  @Type(() => Number)
  @IsInt()
  @NotEquals(0, { message: 'Adjustment quantity cannot be zero.' })
  quantity!: number;

  @ApiProperty({ example: 'Physical stock correction' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ enum: ['ADJUSTMENT', 'DAMAGE'], default: 'ADJUSTMENT' })
  @IsOptional()
  @IsIn(['ADJUSTMENT', 'DAMAGE'])
  type?: 'ADJUSTMENT' | 'DAMAGE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  referenceId?: string;
}

export class OpeningStockDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  productVariantId!: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'Initial count for India Jersey L' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  reorderLevel?: number;
}

export class ReserveStockDto {
  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'Hold for website order ORD-001' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  referenceId?: string;
}

export class ReleaseStockDto extends ReserveStockDto {}

export class ReorderLevelDto {
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  reorderLevel!: number;
}
