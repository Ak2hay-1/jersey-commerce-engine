import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CUSTOMER_STATUSES, CUSTOMER_TOP_SORTS } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_STATUSES })
  @IsOptional()
  @IsIn(CUSTOMER_STATUSES)
  status?: (typeof CUSTOMER_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  tagId?: string;
}

export class CustomerReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_TOP_SORTS })
  @IsOptional()
  @IsIn(CUSTOMER_TOP_SORTS)
  sort?: (typeof CUSTOMER_TOP_SORTS)[number];

  @ApiPropertyOptional({ description: 'Override the default high-value spending threshold.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  highValueThreshold?: number;

  @ApiPropertyOptional({ description: 'Override the default inactivity period in days.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  inactiveDays?: number;
}

export class CustomerHistoryQueryDto extends PaginationQueryDto {}
