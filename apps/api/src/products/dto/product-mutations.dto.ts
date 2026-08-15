import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CATALOG_STATUSES, VARIANT_STATUSES } from '@jersey-commerce/types';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const WEIGHT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) {
    return value;
  }
  return typeof value === 'string' ? value : String(value);
};

export class ProductVariantInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  id?: string;

  @ApiPropertyOptional({ example: 'IND-JER-L' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku?: string;

  @ApiPropertyOptional({ example: '890000000001' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional({ example: 'L' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  size?: string | null;

  @ApiPropertyOptional({ example: 'Navy' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  colour?: string | null;

  @ApiPropertyOptional({ example: '450.00' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'costPrice cannot be negative and must have at most 2 decimal places.' })
  costPrice?: string;

  @ApiPropertyOptional({ example: '899.00' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'sellingPrice cannot be negative and must have at most 2 decimal places.' })
  sellingPrice?: string;

  @ApiPropertyOptional({ example: '1299.00' })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined || value === '' ? undefined : String(value)))
  @Matches(MONEY_PATTERN, { message: 'compareAtPrice cannot be negative and must have at most 2 decimal places.' })
  compareAtPrice?: string;

  @ApiPropertyOptional({ example: '0.220' })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined || value === '' ? undefined : String(value)))
  @Matches(WEIGHT_PATTERN, { message: 'weight cannot be negative and must have at most 3 decimal places.' })
  weight?: string;

  @ApiPropertyOptional({ example: '18.0000', description: 'Percent tax rate. Null inherits the tenant default. Not a GST compliance profile.' })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined || value === '' ? undefined : String(value)))
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/, { message: 'taxRate must be between 0 and 100 with at most 4 decimal places.' })
  taxRate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true' || value === '1'))
  @IsBoolean()
  taxInclusive?: boolean;

  @ApiPropertyOptional({ enum: VARIANT_STATUSES })
  @IsOptional()
  @IsIn(VARIANT_STATUSES)
  status?: (typeof VARIANT_STATUSES)[number];
}

export class CreateProductDto {
  @ApiProperty({ example: 'India Cricket Jersey' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'india-cricket-jersey' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(SLUG_PATTERN, { message: 'slug must be a lowercase URL-safe value.' })
  @MaxLength(180)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Pitch Pro' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: CATALOG_STATUSES })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: (typeof CATALOG_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @ApiProperty({ type: [ProductVariantInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants!: ProductVariantInputDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(SLUG_PATTERN, { message: 'slug must be a lowercase URL-safe value.' })
  @MaxLength(180)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: CATALOG_STATUSES })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: (typeof CATALOG_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string | null;
}

export class CreateProductImageDto {
  @ApiPropertyOptional({ description: 'Remote or placeholder image URL when no file is uploaded.' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  altText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateProductImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  altText?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
