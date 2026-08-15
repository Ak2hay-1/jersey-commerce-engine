import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const DASHBOARD_TTL_SECONDS = 30;

@Injectable()
export class ReportingCacheService {
  private readonly logger = new Logger(ReportingCacheService.name);

  constructor(private readonly redis: RedisService) {}

  key(tenantId: string, namespace: string, parts: Array<string | number | null | undefined>): string {
    const suffix = parts.map((part) => (part == null || part === '' ? '_' : String(part))).join(':');
    return `dashboard:${tenantId}:${namespace}:${suffix}`;
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.getClient().get(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.debug(`Cache read skipped: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds = DASHBOARD_TTL_SECONDS): Promise<void> {
    try {
      await this.redis.getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.debug(`Cache write skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async remember<T>(key: string, loader: () => Promise<T>, ttlSeconds = DASHBOARD_TTL_SECONDS): Promise<T> {
    const hit = await this.getJson<T>(key);
    if (hit) {
      return hit;
    }
    const value = await loader();
    await this.setJson(key, value, ttlSeconds);
    return value;
  }
}
