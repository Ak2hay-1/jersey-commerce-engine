import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

interface ThrottlerHitRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    _limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerHitRecord> {
    const client = this.redis.getClient();
    const redisKey = `throttle:${throttlerName}:${key}`;
    const hits = await client.incr(redisKey);
    if (hits === 1) {
      await client.pexpire(redisKey, ttl);
    }
    const timeToExpire = await client.pttl(redisKey);
    return {
      totalHits: hits,
      timeToExpire: timeToExpire > 0 ? timeToExpire : ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
