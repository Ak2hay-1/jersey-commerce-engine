import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { DISCOUNT_TYPES, FULFILLMENT_METHODS, ORDER_SOURCES, ORDER_STATUSES, PAYMENT_STATUSES } from '@jersey-commerce/types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class OrderShippingAddressDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  addressLine1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  state!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode!: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;
}

export class CheckoutCustomerDto {
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
}

export class StoreCheckoutDto {
  @ApiPropertyOptional({ enum: FULFILLMENT_METHODS })
  @IsOptional()
  @IsIn(FULFILLMENT_METHODS)
  fulfillmentMethod?: (typeof FULFILLMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutCustomerDto)
  customer?: CheckoutCustomerDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderShippingAddressDto)
  shippingAddress?: OrderShippingAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class AddStoreCartItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  productVariantId!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity?: number;
}

export class UpdateStoreCartItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  quantity!: number;
}

export class CancelOrderDto {
  @ApiProperty({ example: 'Customer changed their mind' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES })
  @IsIn(ORDER_STATUSES)
  status!: (typeof ORDER_STATUSES)[number];
}

export class StaffOrderItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  productVariantId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity!: number;
}

export class StaffCreateOrderDto {
  @ApiProperty({ enum: ['WHATSAPP', 'MANUAL'] })
  @IsIn(['WHATSAPP', 'MANUAL'])
  source!: 'WHATSAPP' | 'MANUAL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutCustomerDto)
  customer?: CheckoutCustomerDto;

  @ApiProperty({ type: [StaffOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StaffOrderItemDto)
  items!: StaffOrderItemDto[];

  @ApiPropertyOptional({ enum: FULFILLMENT_METHODS })
  @IsOptional()
  @IsIn(FULFILLMENT_METHODS)
  fulfillmentMethod?: (typeof FULFILLMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderShippingAddressDto)
  shippingAddress?: OrderShippingAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ enum: DISCOUNT_TYPES })
  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: (typeof DISCOUNT_TYPES)[number];

  @ApiPropertyOptional({ example: '10.00' })
  @IsOptional()
  @IsString()
  discountValue?: string;
}

export class AdminOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: (typeof ORDER_STATUSES)[number];

  @ApiPropertyOptional({ enum: PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: (typeof PAYMENT_STATUSES)[number];

  @ApiPropertyOptional({ enum: ORDER_SOURCES })
  @IsOptional()
  @IsIn(ORDER_SOURCES)
  source?: (typeof ORDER_SOURCES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsString()
  minTotal?: string;

  @ApiPropertyOptional({ example: '5000.00' })
  @IsOptional()
  @IsString()
  maxTotal?: string;
}
