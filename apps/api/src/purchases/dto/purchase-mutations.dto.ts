import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return typeof value === 'string' ? value : String(value);
};

export class PurchaseItemInputDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  productVariantId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderedQuantity!: number;

  @ApiProperty({ example: '450.00', description: 'Negotiated supplier unit cost. Not the current catalog price.' })
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'unitCost cannot be negative and must have at most 2 decimal places.' })
  unitCost!: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'discount cannot be negative and must have at most 2 decimal places.' })
  discount?: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'tax cannot be negative and must have at most 2 decimal places.' })
  tax?: string;
}

export class CreatePurchaseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  supplierId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @ApiPropertyOptional({ description: 'ISO date for expected delivery.' })
  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string | null;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'discount cannot be negative and must have at most 2 decimal places.' })
  discount?: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'tax cannot be negative and must have at most 2 decimal places.' })
  tax?: string;

  @ApiProperty({ type: [PurchaseItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInputDto)
  items!: PurchaseItemInputDto[];
}

export class UpdatePurchaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'discount cannot be negative and must have at most 2 decimal places.' })
  discount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'tax cannot be negative and must have at most 2 decimal places.' })
  tax?: string;

  @ApiPropertyOptional({ type: [PurchaseItemInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInputDto)
  items?: PurchaseItemInputDto[];
}

export class ReceivePurchaseItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  productVariantId!: string;

  @ApiProperty({ example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  receivedQuantity!: number;
}

export class ReceivePurchaseDto {
  @ApiPropertyOptional({ type: [ReceivePurchaseItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseItemDto)
  items?: ReceivePurchaseItemDto[];

  @ApiPropertyOptional({ description: 'Shorthand when receiving a single variant.' })
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  receivedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

export class CancelPurchaseDto {
  @ApiProperty({ example: 'Supplier cannot fulfil this order.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;
}
