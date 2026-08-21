import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PROMO_CODE_STATUSES, PROMO_DISCOUNT_TYPES } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export class PromoCodeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  @ApiPropertyOptional({ enum: PROMO_CODE_STATUSES })
  @IsOptional()
  @IsIn(PROMO_CODE_STATUSES)
  status?: (typeof PROMO_CODE_STATUSES)[number];
}

export class GeneratePromoCodeDto {
  @ApiPropertyOptional({ example: 'JFY' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  prefix?: string;
}

export class CreatePromoCodeDto {
  @ApiPropertyOptional({ example: 'SAVE20' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Z0-9-]+$/, { message: 'code must be letters, numbers, or hyphens.' })
  code?: string;

  @ApiProperty({ example: 'Launch discount' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiProperty({ enum: PROMO_DISCOUNT_TYPES })
  @IsIn(PROMO_DISCOUNT_TYPES)
  discountType!: (typeof PROMO_DISCOUNT_TYPES)[number];

  @ApiProperty({ example: '10.00' })
  @Matches(MONEY_PATTERN, { message: 'discountValue cannot be negative and must have at most 2 decimal places.' })
  discountValue!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(MONEY_PATTERN, { message: 'minSubtotal cannot be negative and must have at most 2 decimal places.' })
  minSubtotal?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(MONEY_PATTERN, { message: 'maxDiscount cannot be negative and must have at most 2 decimal places.' })
  maxDiscount?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  usageLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  startsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  endsAt?: string | null;
}

export class UpdatePromoCodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(400)
  description?: string | null;

  @ApiPropertyOptional({ enum: PROMO_DISCOUNT_TYPES })
  @IsOptional()
  @IsIn(PROMO_DISCOUNT_TYPES)
  discountType?: (typeof PROMO_DISCOUNT_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(MONEY_PATTERN, { message: 'discountValue cannot be negative and must have at most 2 decimal places.' })
  discountValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(MONEY_PATTERN, { message: 'minSubtotal cannot be negative and must have at most 2 decimal places.' })
  minSubtotal?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(MONEY_PATTERN, { message: 'maxDiscount cannot be negative and must have at most 2 decimal places.' })
  maxDiscount?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  usageLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  startsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  endsAt?: string | null;

  @ApiPropertyOptional({ enum: PROMO_CODE_STATUSES })
  @IsOptional()
  @IsIn(PROMO_CODE_STATUSES)
  status?: (typeof PROMO_CODE_STATUSES)[number];
}

export class ApplyStorePromoDto {
  @ApiProperty({ example: 'SAVE20' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code!: string;
}
