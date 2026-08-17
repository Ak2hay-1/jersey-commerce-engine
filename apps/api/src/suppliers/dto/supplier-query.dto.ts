import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUPPLIER_STATUSES } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const SUPPLIER_SORTS = ['name', 'createdAt', 'updatedAt'] as const;
export type SupplierSort = (typeof SUPPLIER_SORTS)[number];

export class SupplierQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Premium Sports' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: SUPPLIER_STATUSES })
  @IsOptional()
  @IsIn(SUPPLIER_STATUSES)
  status?: (typeof SUPPLIER_STATUSES)[number];

  @ApiPropertyOptional({ enum: SUPPLIER_SORTS })
  @IsOptional()
  @IsIn(SUPPLIER_SORTS)
  sort?: SupplierSort;
}
