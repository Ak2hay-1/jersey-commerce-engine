import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Refresh token. If omitted, the httpOnly cookie is used.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  refreshToken?: string;
}
