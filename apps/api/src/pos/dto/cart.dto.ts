import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DISCOUNT_TYPES } from '@jersey-commerce/types';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return typeof value === 'string' ? value : String(value);
};

export class PosNewCustomerDto {
  @ApiProperty({ example: 'Walk-in Guest' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Create even when a phone or email match already exists. Duplicates are never merged automatically.',
  })
  @IsOptional()
  @IsBoolean()
  allowDuplicate?: boolean;
}

export class PosCartCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  customerId?: string;

  @ApiPropertyOptional({ description: 'Walk-in sale with no customer profile.' })
  @IsOptional()
  @IsBoolean()
  walkIn?: boolean;

  @ApiPropertyOptional({ type: PosNewCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PosNewCustomerDto)
  newCustomer?: PosNewCustomerDto;
}

export class CreatePosCartDto extends PosCartCustomerDto {
  @ApiPropertyOptional({ enum: DISCOUNT_TYPES })
  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: (typeof DISCOUNT_TYPES)[number];

  @ApiPropertyOptional({ example: '100.00' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'discountValue cannot be negative and must have at most 2 decimal places.' })
  discountValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdatePosCartDto extends CreatePosCartDto {}

export class AddPosCartItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  productVariantId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({ enum: DISCOUNT_TYPES })
  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: (typeof DISCOUNT_TYPES)[number];

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'discountValue cannot be negative and must have at most 2 decimal places.' })
  discountValue?: string;
}

export class UpdatePosCartItemDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ enum: DISCOUNT_TYPES })
  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: (typeof DISCOUNT_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'discountValue cannot be negative and must have at most 2 decimal places.' })
  discountValue?: string;
}
