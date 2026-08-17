import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SUPPLIER_PAYMENT_METHODS } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return typeof value === 'string' ? value : String(value);
};

export class CreateSupplierPaymentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  supplierId!: string;

  @ApiPropertyOptional({ description: 'When set, the payment is applied to this purchase payable.' })
  @IsOptional()
  @IsString()
  purchaseId?: string | null;

  @ApiProperty({ example: '20000.00' })
  @Transform(toOptionalString)
  @Matches(MONEY_PATTERN, { message: 'amount must be greater than 0 and have at most 2 decimal places.' })
  amount!: string;

  @ApiProperty({ enum: SUPPLIER_PAYMENT_METHODS })
  @IsIn(SUPPLIER_PAYMENT_METHODS)
  paymentMethod!: (typeof SUPPLIER_PAYMENT_METHODS)[number];

  @ApiPropertyOptional({ description: 'Cheque number, UTR, or other non-secret reference.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class SupplierPaymentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseId?: string;

  @ApiPropertyOptional({ enum: SUPPLIER_PAYMENT_METHODS })
  @IsOptional()
  @IsIn(SUPPLIER_PAYMENT_METHODS)
  paymentMethod?: (typeof SUPPLIER_PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
