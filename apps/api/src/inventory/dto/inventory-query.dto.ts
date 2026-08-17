import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { INVENTORY_MOVEMENT_TYPES, INVENTORY_SORTS } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true' || value === '1';
};

export class InventoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'india' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(64)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional({ description: 'On-hand quantity at or below the variant reorder level' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({ description: 'On-hand quantity is zero' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  outOfStock?: boolean;

  @ApiPropertyOptional({ enum: INVENTORY_SORTS, default: 'updatedAt' })
  @IsOptional()
  @IsIn(INVENTORY_SORTS)
  sort?: (typeof INVENTORY_SORTS)[number];
}

export class InventoryMovementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: INVENTORY_MOVEMENT_TYPES })
  @IsOptional()
  @IsIn(INVENTORY_MOVEMENT_TYPES)
  type?: (typeof INVENTORY_MOVEMENT_TYPES)[number];

  @ApiPropertyOptional({ description: 'Inclusive start of createdAt range (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive end of createdAt range (ISO-8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
