import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../../redis/redis.service';

interface ThrottlerHitRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed storage for `@nestjs/throttler` v6. The guard only rejects a
 * request when `isBlocked` is true, so blocking must be computed here.
 * Returned times are in seconds, matching the built-in in-memory storage.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerHitRecord> {
    const client = this.redis.getClient();
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle-block:${throttlerName}:${key}`;

    const blockTtl = await client.pttl(blockKey);
    if (blockTtl > 0) {
      const hitsTtl = await client.pttl(hitsKey);
      return {
        totalHits: limit + 1,
        timeToExpire: toSeconds(hitsTtl > 0 ? hitsTtl : ttl),
        isBlocked: true,
        timeToBlockExpire: toSeconds(blockTtl),
      };
    }

    const hits = await client.incr(hitsKey);
    if (hits === 1) {
      await client.pexpire(hitsKey, ttl);
    }
    const hitsTtl = await client.pttl(hitsKey);
    const timeToExpire = toSeconds(hitsTtl > 0 ? hitsTtl : ttl);

    if (hits > limit) {
      const blockMs = blockDuration > 0 ? blockDuration : ttl;
      await client.set(blockKey, '1', 'PX', blockMs);
      await client.del(hitsKey);
      return {
        totalHits: hits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: toSeconds(blockMs),
      };
    }

    return {
      totalHits: hits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}

function toSeconds(milliseconds: number): number {
  return Math.max(1, Math.ceil(milliseconds / 1000));
}
