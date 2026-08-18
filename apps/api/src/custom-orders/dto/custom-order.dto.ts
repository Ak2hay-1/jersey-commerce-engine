import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CUSTOM_ORDER_ITEM_MODES,
  CUSTOM_ORDER_PRODUCTION_STATUSES,
  CUSTOM_ORDER_STATUSES,
  CUSTOM_ORDER_TYPES,
  CUSTOMIZATION_OPTION_STATUSES,
  CUSTOMIZATION_PRICING_TYPES,
  DESIGN_APPROVAL_DECISIONS,
  PAYMENT_METHODS,
} from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return typeof value === 'string' ? value : String(value);
};

const toOptionalInt = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

export class CustomOrderInquiryDto {
  @ApiProperty()
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
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  teamName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalInt)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity?: number;

  @ApiPropertyOptional({ enum: CUSTOM_ORDER_TYPES })
  @IsOptional()
  @IsIn(CUSTOM_ORDER_TYPES)
  type?: (typeof CUSTOM_ORDER_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  preferredJerseyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredColours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  requiredDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  customizationRequirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class CustomOrderItemInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  productVariantId?: string;

  @ApiProperty({ enum: CUSTOM_ORDER_ITEM_MODES })
  @IsIn(CUSTOM_ORDER_ITEM_MODES)
  lineType!: (typeof CUSTOM_ORDER_ITEM_MODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  playerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  jerseyNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  colour?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  unitPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  customizationFee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateCustomOrderDto extends CustomOrderInquiryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomOrderItemInputDto)
  items?: CustomOrderItemInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  customizationOptionIds?: string[];
}

export class UpdateCustomOrderDto {
  @ApiPropertyOptional({ enum: CUSTOM_ORDER_TYPES })
  @IsOptional()
  @IsIn(CUSTOM_ORDER_TYPES)
  type?: (typeof CUSTOM_ORDER_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  teamName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  preferredJerseyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredColours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  customizationRequirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  requestedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomOrderItemInputDto)
  items?: CustomOrderItemInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  customizationOptionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  reserveInventory?: boolean;
}

export class CreateCustomOrderQuoteDto {
  @ApiProperty()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  unitPrice!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  customizationCharges?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  discount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  tax?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  shippingAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  depositRequired?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  estimatedCompletionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  send?: boolean;
}

export class DesignDecisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class StaffDesignDecisionDto extends DesignDecisionDto {
  @ApiPropertyOptional({ enum: DESIGN_APPROVAL_DECISIONS })
  @IsOptional()
  @IsIn(DESIGN_APPROVAL_DECISIONS)
  decision?: (typeof DESIGN_APPROVAL_DECISIONS)[number];
}

export class RecordCustomOrderPaymentDto {
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @ApiProperty()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  amount!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  amountReceived?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  confirmed?: boolean;

  @ApiPropertyOptional({ enum: ['DEPOSIT', 'BALANCE'] })
  @IsOptional()
  @IsIn(['DEPOSIT', 'BALANCE'])
  purpose?: 'DEPOSIT' | 'BALANCE';
}

export class UpdateCustomOrderStatusDto {
  @ApiPropertyOptional({ enum: CUSTOM_ORDER_STATUSES })
  @IsOptional()
  @IsIn(CUSTOM_ORDER_STATUSES)
  status?: (typeof CUSTOM_ORDER_STATUSES)[number];

  @ApiPropertyOptional({ enum: CUSTOM_ORDER_PRODUCTION_STATUSES })
  @IsOptional()
  @IsIn(CUSTOM_ORDER_PRODUCTION_STATUSES)
  productionStatus?: (typeof CUSTOM_ORDER_PRODUCTION_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CancelCustomOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CustomOrderNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class CustomizationOptionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: CUSTOMIZATION_PRICING_TYPES })
  @IsIn(CUSTOMIZATION_PRICING_TYPES)
  pricingType!: (typeof CUSTOMIZATION_PRICING_TYPES)[number];

  @ApiProperty()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN)
  price!: string;

  @ApiPropertyOptional({ enum: CUSTOMIZATION_OPTION_STATUSES })
  @IsOptional()
  @IsIn(CUSTOMIZATION_OPTION_STATUSES)
  status?: (typeof CUSTOMIZATION_OPTION_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class CustomOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CUSTOM_ORDER_STATUSES })
  @IsOptional()
  @IsIn(CUSTOM_ORDER_STATUSES)
  status?: (typeof CUSTOM_ORDER_STATUSES)[number];

  @ApiPropertyOptional({ enum: CUSTOM_ORDER_TYPES })
  @IsOptional()
  @IsIn(CUSTOM_ORDER_TYPES)
  type?: (typeof CUSTOM_ORDER_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
