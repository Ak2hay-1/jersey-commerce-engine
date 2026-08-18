import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { ServerEnv } from '@jersey-commerce/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../token.service';
import { ACCESS_TOKEN_TYPE, type AccessTokenPayload } from '../auth.constants';
import {
  isUserAllowedToAuthenticate,
  toAuthPrincipal,
  userAuthInclude,
  type UserWithAuth,
} from '../../users/user.mapper';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<ServerEnv, true>,
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: AccessTokenPayload) {
    if (payload.typ !== ACCESS_TOKEN_TYPE || !payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Authentication required.');
    }
    if (await this.tokens.isAccessTokenDenied(payload.jti)) {
      throw new UnauthorizedException('Authentication required.');
    }
    const user = await this.prisma.withoutTenantScope(async () =>
      this.prisma.user.findFirst({
        where: { id: payload.sub },
        include: userAuthInclude,
      }),
    );
    if (
      !user ||
      user.tenantId !== payload.tenantId ||
      user.tokenVersion !== payload.ver ||
      !isUserAllowedToAuthenticate(user)
    ) {
      throw new UnauthorizedException('Authentication required.');
    }
    return toAuthPrincipal(user as UserWithAuth, payload.jti);
  }
}
