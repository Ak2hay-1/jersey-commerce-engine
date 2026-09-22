import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DELHIVERY_ENVIRONMENTS, DELHIVERY_SERVICE_MODES } from '@jersey-commerce/types';

export class UpdateShippingSettingsDto {
  @ApiProperty()
  @IsBoolean()
  delhiveryEnabled!: boolean;

  @ApiPropertyOptional({ description: 'Leave blank to keep. Send null to clear.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  delhiveryApiToken?: string | null;

  @ApiProperty({ enum: DELHIVERY_ENVIRONMENTS })
  @IsIn(DELHIVERY_ENVIRONMENTS)
  delhiveryEnvironment!: (typeof DELHIVERY_ENVIRONMENTS)[number];

  @ApiProperty({ enum: DELHIVERY_SERVICE_MODES })
  @IsIn(DELHIVERY_SERVICE_MODES)
  delhiveryServiceMode!: (typeof DELHIVERY_SERVICE_MODES)[number];

  @ApiProperty()
  @IsBoolean()
  codEnabled!: boolean;

  @ApiProperty({ example: '0.500' })
  @IsNumberString()
  defaultPackageWeightKg!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  warehouseName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(40)
  warehousePhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  warehouseAddress?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  warehouseCity?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  warehouseState?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(20)
  warehousePostalCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  warehouseCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  pickupLocation?: string | null;

  @ApiPropertyOptional({ description: 'Leave blank to keep. Send null to clear.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(512)
  webhookSecret?: string | null;
}

export class StoreShippingPincodeDto {
  @ApiProperty({ example: '560001' })
  @IsString()
  @MaxLength(12)
  postalCode!: string;
}

export class StoreShippingQuoteDto {
  @ApiProperty({ example: '560001' })
  @IsString()
  @MaxLength(12)
  postalCode!: string;

  @ApiPropertyOptional({ enum: DELHIVERY_SERVICE_MODES })
  @IsOptional()
  @IsIn(DELHIVERY_SERVICE_MODES)
  mode?: (typeof DELHIVERY_SERVICE_MODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  cod?: boolean;
}
