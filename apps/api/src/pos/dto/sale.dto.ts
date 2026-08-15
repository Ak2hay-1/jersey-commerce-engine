import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PAYMENT_METHODS, SALE_STATUSES } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return typeof value === 'string' ? value : String(value);
};

export class PosPaymentInputDto {
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional({ description: 'Amount applied to the sale. Defaults to the remaining total for a single payment.' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'amount cannot be negative and must have at most 2 decimal places.' })
  amount?: string;

  @ApiPropertyOptional({ description: 'Cash tendered by the customer. Required for CASH.' })
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'amountReceived cannot be negative and must have at most 2 decimal places.' })
  amountReceived?: string;

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

  @ApiPropertyOptional({
    description: 'Required for UPI, CARD, and OTHER. Cashier confirmation — not a gateway confirmation.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  confirmed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CompleteSaleDto {
  @ApiPropertyOptional({ description: 'Defaults to the cashier’s active cart.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  cartId?: string;

  @ApiProperty({ type: [PosPaymentInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosPaymentInputDto)
  payments!: PosPaymentInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CancelSaleDto {
  @ApiProperty({ example: 'Customer changed size after payment.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class PosSaleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ISO date/time inclusive start' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date/time inclusive end' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cashierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: SALE_STATUSES })
  @IsOptional()
  @IsIn(SALE_STATUSES)
  status?: (typeof SALE_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'minAmount cannot be negative and must have at most 2 decimal places.' })
  minAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'maxAmount cannot be negative and must have at most 2 decimal places.' })
  maxAmount?: string;

  @ApiPropertyOptional({ enum: ['created_desc', 'created_asc', 'total_desc', 'total_asc', 'invoice_asc'] })
  @IsOptional()
  @IsIn(['created_desc', 'created_asc', 'total_desc', 'total_asc', 'invoice_asc'])
  sort?: 'created_desc' | 'created_asc' | 'total_desc' | 'total_asc' | 'invoice_asc';
}
