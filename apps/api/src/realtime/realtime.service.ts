import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { shouldPublishRealtime } from '@jersey-commerce/utils';
import type { RealtimeEvent } from '@jersey-commerce/types';
import { RedisService } from '../redis/redis.service';

const CHANNEL_PREFIX = 'realtime:tenant:';

interface PublishedEnvelope extends RealtimeEvent {
  origin: string;
}

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly instanceId = randomUUID();
  private readonly sockets = new Map<string, Set<WebSocket>>();
  private subscriber: ReturnType<RedisService['getClient']> | null = null;

  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.subscriber = this.redis.getClient().duplicate();
      this.subscriber.on('error', (error) => {
        this.logger.warn(`Realtime Redis subscriber error: ${error.message}`);
      });
      if (this.subscriber.status === 'wait') {
        await this.subscriber.connect();
      }
      await this.subscriber.psubscribe(`${CHANNEL_PREFIX}*`);
      this.subscriber.on('pmessage', (_pattern, channel, message) => {
        const tenantId = channel.slice(CHANNEL_PREFIX.length);
        try {
          const envelope = JSON.parse(message) as PublishedEnvelope;
          if (envelope.origin === this.instanceId) {
            return;
          }
          this.fanout(tenantId, {
            action: envelope.action,
            entity: envelope.entity,
            entityId: envelope.entityId,
            at: envelope.at,
          });
        } catch (error) {
          this.logger.warn(
            `Ignored realtime payload: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
    } catch (error) {
      this.logger.warn(
        `Realtime Redis subscriber unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber && this.subscriber.status !== 'end') {
      await this.subscriber.punsubscribe(`${CHANNEL_PREFIX}*`);
      await this.subscriber.quit();
    }
  }

  register(tenantId: string, socket: WebSocket): void {
    let group = this.sockets.get(tenantId);
    if (!group) {
      group = new Set();
      this.sockets.set(tenantId, group);
    }
    group.add(socket);
  }

  unregister(tenantId: string, socket: WebSocket): void {
    const group = this.sockets.get(tenantId);
    if (!group) {
      return;
    }
    group.delete(socket);
    if (group.size === 0) {
      this.sockets.delete(tenantId);
    }
  }

  async publish(input: {
    action: string;
    entity: string;
    entityId: string;
    tenantId?: string;
  }): Promise<void> {
    if (!shouldPublishRealtime(input.action, input.tenantId) || !input.tenantId) {
      return;
    }
    const event: RealtimeEvent = {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      at: new Date().toISOString(),
    };
    this.fanout(input.tenantId, event);
    try {
      const envelope: PublishedEnvelope = { ...event, origin: this.instanceId };
      await this.redis.getClient().publish(`${CHANNEL_PREFIX}${input.tenantId}`, JSON.stringify(envelope));
    } catch (error) {
      this.logger.warn(
        `Realtime publish failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private fanout(tenantId: string, event: RealtimeEvent): void {
    const group = this.sockets.get(tenantId);
    if (!group?.size) {
      return;
    }
    const payload = JSON.stringify(event);
    for (const socket of group) {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    }
  }
}
