import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AuthRateLimiterService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<ServerEnv, true>,
  ) {}

  async consume(bucket: string): Promise<void> {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') {
      return;
    }
    const limit = this.config.get('AUTH_RATE_LIMIT', { infer: true });
    const windowSeconds = this.config.get('AUTH_RATE_WINDOW_SECONDS', { infer: true });
    const key = `auth:rl:${bucket}`;
    const client = this.redis.getClient();
    const hits = await client.incr(key);
    if (hits === 1) {
      await client.expire(key, windowSeconds);
    }
    if (hits > limit) {
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
