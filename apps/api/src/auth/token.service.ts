import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomUUID } from 'node:crypto';
import type { ServerEnv } from '@jersey-commerce/config';
import { createOpaqueToken } from '../common/crypto/token-hash';
import { parseExpirationToMs, parseExpirationToSeconds } from '../common/time/expiration';
import { ACCESS_TOKEN_TYPE, CUSTOMER_TOKEN_TYPE, type AccessTokenPayload, type CustomerAccessTokenPayload } from './auth.constants';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ServerEnv, true>,
    private readonly redis: RedisService,
  ) {}

  accessExpiresInSeconds(): number {
    return parseExpirationToSeconds(this.config.get('JWT_ACCESS_EXPIRATION', { infer: true }));
  }

  accessExpiresInMs(): number {
    return parseExpirationToMs(this.config.get('JWT_ACCESS_EXPIRATION', { infer: true }));
  }

  refreshExpiresInMs(): number {
    return parseExpirationToMs(this.config.get('JWT_REFRESH_EXPIRATION', { infer: true }));
  }

  signAccessToken(input: { userId: string; tenantId: string; tokenVersion: number }) {
    const jti = randomUUID();
    const expiresIn = this.accessExpiresInSeconds();
    const payload: AccessTokenPayload = {
      sub: input.userId,
      tenantId: input.tenantId,
      ver: input.tokenVersion,
      typ: ACCESS_TOKEN_TYPE,
      jti,
    };
    return {
      token: this.jwt.sign(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn,
      }),
      jti,
      expiresIn,
    };
  }

  signCustomerAccessToken(input: { customerId: string; tenantId: string }) {
    const jti = randomUUID();
    const expiresIn = 60 * 60 * 24 * 30;
    const payload: CustomerAccessTokenPayload = {
      sub: input.customerId,
      tenantId: input.tenantId,
      typ: CUSTOMER_TOKEN_TYPE,
      jti,
    };
    return {
      token: this.jwt.sign(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn,
      }),
      jti,
      expiresIn,
    };
  }

  verifyCustomerAccessToken(token: string): CustomerAccessTokenPayload {
    const payload = this.jwt.verify<CustomerAccessTokenPayload>(token, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
    if (payload.typ !== CUSTOMER_TOKEN_TYPE || !payload.sub || !payload.tenantId) {
      throw new Error('Invalid customer access token.');
    }
    return payload;
  }

  createRefreshTokenValue(): { token: string; tokenHash: string; familyId: string } {
    const token = createOpaqueToken('rt_');
    return { token, tokenHash: this.hashRefreshToken(token), familyId: randomUUID() };
  }

  hashRefreshToken(token: string): string {
    return createHmac('sha256', this.config.get('JWT_REFRESH_SECRET', { infer: true }))
      .update(token)
      .digest('hex');
  }

  async denylistAccessToken(jti: string, ttlMs: number): Promise<void> {
    await this.redis.getClient().set(`auth:denylist:${jti}`, '1', 'EX', Math.max(1, Math.ceil(ttlMs / 1000)));
  }

  async isAccessTokenDenied(jti: string): Promise<boolean> {
    return (await this.redis.getClient().get(`auth:denylist:${jti}`)) === '1';
  }
}
