import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CUSTOM_ORDER_STATUSES,
  DATE_RANGE_PRESETS,
  ORDER_SOURCES,
  PAYMENT_METHODS,
  REVENUE_GRANULARITIES,
  REPORT_EXPORT_FORMATS,
  SALE_STATUSES,
  TOP_PRODUCT_SORTS,
} from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true' || value === '1';
};

export class ReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cashierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export const TOP_SUPPLIER_SORTS = ['totalPurchases', 'outstanding', 'quantity'] as const;

export class PurchaseReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ enum: TOP_SUPPLIER_SORTS })
  @IsOptional()
  @IsIn(TOP_SUPPLIER_SORTS)
  sort?: (typeof TOP_SUPPLIER_SORTS)[number];
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: DATE_RANGE_PRESETS, default: 'today' })
  @IsOptional()
  @IsIn(DATE_RANGE_PRESETS)
  preset?: (typeof DATE_RANGE_PRESETS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: REVENUE_GRANULARITIES })
  @IsOptional()
  @IsIn(REVENUE_GRANULARITIES)
  granularity?: (typeof REVENUE_GRANULARITIES)[number];

  @ApiPropertyOptional({ enum: TOP_PRODUCT_SORTS })
  @IsOptional()
  @IsIn(TOP_PRODUCT_SORTS)
  sort?: (typeof TOP_PRODUCT_SORTS)[number];
}

export class SalesReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DATE_RANGE_PRESETS })
  @IsOptional()
  @IsIn(DATE_RANGE_PRESETS)
  preset?: (typeof DATE_RANGE_PRESETS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: ORDER_SOURCES })
  @IsOptional()
  @IsIn(ORDER_SOURCES)
  source?: (typeof ORDER_SOURCES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cashierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: SALE_STATUSES })
  @IsOptional()
  @IsIn(SALE_STATUSES)
  status?: (typeof SALE_STATUSES)[number];

  @ApiPropertyOptional({ enum: REPORT_EXPORT_FORMATS })
  @IsOptional()
  @IsIn(REPORT_EXPORT_FORMATS)
  format?: (typeof REPORT_EXPORT_FORMATS)[number];
}

export class InventoryReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  outOfStock?: boolean;

  @ApiPropertyOptional({ enum: REPORT_EXPORT_FORMATS })
  @IsOptional()
  @IsIn(REPORT_EXPORT_FORMATS)
  format?: (typeof REPORT_EXPORT_FORMATS)[number];
}

export class CustomerAnalyticsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DATE_RANGE_PRESETS })
  @IsOptional()
  @IsIn(DATE_RANGE_PRESETS)
  preset?: (typeof DATE_RANGE_PRESETS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: ['new', 'repeat', 'high_value', 'inactive', 'top'] })
  @IsOptional()
  @IsIn(['new', 'repeat', 'high_value', 'inactive', 'top'])
  segment?: 'new' | 'repeat' | 'high_value' | 'inactive' | 'top';
}

export class ExpenseReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DATE_RANGE_PRESETS })
  @IsOptional()
  @IsIn(DATE_RANGE_PRESETS)
  preset?: (typeof DATE_RANGE_PRESETS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class PaymentReportQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cashierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class CustomOrderReportQueryDto {
  @ApiPropertyOptional({ enum: DATE_RANGE_PRESETS })
  @IsOptional()
  @IsIn(DATE_RANGE_PRESETS)
  preset?: (typeof DATE_RANGE_PRESETS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: CUSTOM_ORDER_STATUSES })
  @IsOptional()
  @IsIn(CUSTOM_ORDER_STATUSES)
  status?: (typeof CUSTOM_ORDER_STATUSES)[number];
}
