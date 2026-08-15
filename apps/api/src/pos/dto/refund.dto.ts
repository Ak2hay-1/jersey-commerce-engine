import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
import { PAYMENT_METHODS, RESTOCK_DISPOSITIONS } from '@jersey-commerce/types';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return typeof value === 'string' ? value : String(value);
};

export class RefundItemInputDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  saleItemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ enum: RESTOCK_DISPOSITIONS, default: 'RESTOCK' })
  @IsOptional()
  @IsIn(RESTOCK_DISPOSITIONS)
  restock?: (typeof RESTOCK_DISPOSITIONS)[number];
}

export class RefundPaymentInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  paymentId?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  method?: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'amount cannot be negative and must have at most 2 decimal places.' })
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  confirmed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;
}

export class RefundSaleDto {
  @ApiProperty({ example: 'Wrong size purchased' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ type: [RefundItemInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefundItemInputDto)
  items?: RefundItemInputDto[];

  @ApiPropertyOptional({ type: [RefundPaymentInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundPaymentInputDto)
  payments?: RefundPaymentInputDto[];

  @ApiPropertyOptional({
    description: 'Cashier confirmation for electronic refunds when payment allocations are omitted.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  confirmed?: boolean;
}
