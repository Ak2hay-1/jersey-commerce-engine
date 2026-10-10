import { RedisThrottlerStorage } from '../auth/rate-limit/redis-throttler.storage';
import type { RedisService } from './redis.service';

class FakeRedis {
  private readonly values = new Map<string, { value: string; expiresAt: number | null }>();
  now = 1_000_000;

  private live(key: string) {
    const entry = this.values.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= this.now) {
      this.values.delete(key);
      return undefined;
    }
    return entry;
  }

  async incr(key: string) {
    const entry = this.live(key);
    const next = (entry ? Number(entry.value) : 0) + 1;
    this.values.set(key, { value: String(next), expiresAt: entry?.expiresAt ?? null });
    return next;
  }

  async pexpire(key: string, ms: number) {
    const entry = this.live(key);
    if (entry) entry.expiresAt = this.now + ms;
    return 1;
  }

  async pttl(key: string) {
    const entry = this.live(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return entry.expiresAt - this.now;
  }

  async set(key: string, value: string, _mode: 'PX', ms: number) {
    this.values.set(key, { value, expiresAt: this.now + ms });
    return 'OK';
  }

  async del(key: string) {
    return this.values.delete(key) ? 1 : 0;
  }
}

function createStorage() {
  const redis = new FakeRedis();
  const service = { getClient: () => redis } as unknown as RedisService;
  return { redis, storage: new RedisThrottlerStorage(service) };
}

describe('RedisThrottlerStorage', () => {
  it('allows requests up to the limit', async () => {
    const { storage } = createStorage();
    for (let i = 1; i <= 3; i += 1) {
      const record = await storage.increment('ip', 60_000, 3, 60_000, 'default');
      expect(record.isBlocked).toBe(false);
      expect(record.totalHits).toBe(i);
    }
  });

  it('blocks once the limit is exceeded and keeps blocking for blockDuration', async () => {
    const { redis, storage } = createStorage();
    for (let i = 0; i < 3; i += 1) {
      await storage.increment('ip', 60_000, 3, 30_000, 'default');
    }
    const blocked = await storage.increment('ip', 60_000, 3, 30_000, 'default');
    expect(blocked.isBlocked).toBe(true);
    expect(blocked.timeToBlockExpire).toBe(30);

    redis.now += 10_000;
    const stillBlocked = await storage.increment('ip', 60_000, 3, 30_000, 'default');
    expect(stillBlocked.isBlocked).toBe(true);
    expect(stillBlocked.timeToBlockExpire).toBe(20);

    redis.now += 21_000;
    const released = await storage.increment('ip', 60_000, 3, 30_000, 'default');
    expect(released.isBlocked).toBe(false);
    expect(released.totalHits).toBe(1);
  });

  it('keeps separate counters per key', async () => {
    const { storage } = createStorage();
    await storage.increment('a', 60_000, 1, 60_000, 'default');
    expect((await storage.increment('a', 60_000, 1, 60_000, 'default')).isBlocked).toBe(true);
    expect((await storage.increment('b', 60_000, 1, 60_000, 'default')).isBlocked).toBe(false);
  });
});
