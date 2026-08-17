import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { Response } from 'express';

describe('HealthController', () => {
  const prisma = { isReady: jest.fn() } as unknown as PrismaService;
  const redis = { isReady: jest.fn() } as unknown as RedisService;
  const controller = new HealthController(prisma, redis);

  it('returns liveness without checking dependencies', () => {
    const result = controller.getHealth();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('jersey-commerce-engine');
  });

  it('returns 503 when a dependency is down', async () => {
    (prisma.isReady as jest.Mock).mockResolvedValue(false);
    (redis.isReady as jest.Mock).mockResolvedValue(true);
    const status = jest.fn();
    const result = await controller.getReady({ status } as unknown as Response);
    expect(result.status).toBe('degraded');
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
