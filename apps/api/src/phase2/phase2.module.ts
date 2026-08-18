import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { ServerEnv } from '@jersey-commerce/config';
import { RedisThrottlerStorage } from '../auth/rate-limit/redis-throttler.storage';
import { RedisService } from '../redis/redis.service';
import { TenantContextModule } from '../common/context/tenant-context.module';
import { RbacModule } from '../rbac/rbac.module';

@Global()
@Module({
  imports: [
    TenantContextModule,
    RbacModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, RedisService],
      useFactory: (config: ConfigService<ServerEnv, true>, redis: RedisService) => ({
        throttlers: [
          {
            ttl: config.get('AUTH_RATE_WINDOW_SECONDS', { infer: true }) * 1000,
            limit: config.get('NODE_ENV', { infer: true }) === 'test' ? 10_000 : 120,
          },
        ],
        storage: new RedisThrottlerStorage(redis),
        skipIf: () => config.get('NODE_ENV', { infer: true }) === 'test',
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class Phase2Module {}
