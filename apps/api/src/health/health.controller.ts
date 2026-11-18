import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { SERVICE_NAME } from '@jersey-commerce/config';
import type { HealthResponse, ReadinessResponse } from '@jersey-commerce/types';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@SkipThrottle()
@Controller()
@ApiTags('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Process is running' })
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({ description: 'Dependencies are reachable' })
  @ApiServiceUnavailableResponse({ description: 'One or more dependencies are unavailable' })
  async getReady(@Res({ passthrough: true }) response: Response): Promise<ReadinessResponse> {
    const [databaseReady, redisReady] = await Promise.all([this.prisma.isReady(), this.redis.isReady()]);
    const ready = databaseReady && redisReady;
    if (!ready) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: ready ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}
