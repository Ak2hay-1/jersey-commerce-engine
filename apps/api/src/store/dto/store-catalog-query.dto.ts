import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PRODUCT_SORTS } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true' || value === '1';
};

export class StoreCatalogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
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
  @MaxLength(180)
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  colour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : String(value)))
  @Matches(MONEY_PATTERN)
  minPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : String(value)))
  @Matches(MONEY_PATTERN)
  maxPrice?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS })
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: (typeof PRODUCT_SORTS)[number];
}

export class StoreResolveQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  host?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  slug?: string;
}
