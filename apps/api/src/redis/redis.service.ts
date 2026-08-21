import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { ServerEnv } from '@jersey-commerce/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService<ServerEnv, true>) {
    this.client = new Redis(this.config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      // Reconnect after Redis restarts; previously `() => null` left the API
      // permanently disconnected and turned every login into a 500.
      retryStrategy: (attempt) => Math.min(attempt * 200, 3000),
    });
    this.client.on('error', (error) => {
      this.logger.warn(`Redis client error: ${error.message}`);
    });
    this.client.on('reconnecting', () => {
      this.logger.warn('Reconnecting to Redis');
    });
    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureConnected();
    } catch (error) {
      this.logger.error(
        'Redis connection failed during startup',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ensureConnected(): Promise<void> {
    const { status } = this.client;
    if (status === 'ready') {
      return;
    }
    if (status === 'wait' || status === 'end') {
      await this.client.connect();
      return;
    }
    // connecting / reconnecting / connect — wait until ready or fail on ping
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onEnd = () => {
        cleanup();
        reject(new Error('Redis connection closed'));
      };
      const cleanup = () => {
        this.client.off('ready', onReady);
        this.client.off('end', onEnd);
      };
      this.client.once('ready', onReady);
      this.client.once('end', onEnd);
      if (this.client.status === 'ready') {
        cleanup();
        resolve();
      }
    });
  }

  async isReady(): Promise<boolean> {
    try {
      await this.ensureConnected();
      const response = await this.client.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }
}
