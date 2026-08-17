import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PURCHASE_STATUSES } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const PURCHASE_SORTS = ['createdAt', 'purchaseNumber', 'total', 'status'] as const;
export type PurchaseSort = (typeof PURCHASE_SORTS)[number];

export class PurchaseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: PURCHASE_STATUSES })
  @IsOptional()
  @IsIn(PURCHASE_STATUSES)
  status?: (typeof PURCHASE_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: PURCHASE_SORTS })
  @IsOptional()
  @IsIn(PURCHASE_SORTS)
  sort?: PurchaseSort;
}
