import { ApiProperty } from '@nestjs/swagger';
import type { AuthUser } from '@jersey-commerce/types';

export class AuthTokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ description: 'Opaque refresh token. Also set as an httpOnly cookie.' })
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Access token lifetime in seconds' })
  expiresIn!: number;

  @ApiProperty({ type: Object })
  user!: AuthUser;
}
