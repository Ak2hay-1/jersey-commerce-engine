import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Page size. Alias of limit.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Page size. Alias of pageSize.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface PaginationArgs {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function toPaginationArgs(query: PaginationQueryDto): PaginationArgs {
  const page = query.page ?? 1;
  const pageSize = query.limit ?? query.pageSize ?? 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function toPaginationMeta(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    limit: pageSize,
    totalItems,
    total: totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize) || 1),
  };
}
