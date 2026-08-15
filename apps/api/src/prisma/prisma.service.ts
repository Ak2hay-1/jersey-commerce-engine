import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import { applyTenantExtension, type TenantScopedPrisma } from './tenant-extension';
import { withoutTenantScope } from '../common/context/request-context';

/* Prisma $extends proxy is typed via declaration merging with this Nest injectable. */
/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
export interface PrismaService extends TenantScopedPrisma {
  readonly __tenantScopedPrisma?: true;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const scoped = applyTenantExtension(new PrismaClient());
    return new Proxy(this, {
      get: (target, property, receiver) => {
        if (property in target) {
          return Reflect.get(target, property, receiver);
        }
        const value = Reflect.get(scoped, property);
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(scoped) : value;
      },
    }) as this;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL');
    } catch (error) {
      this.logger.error(
        'PostgreSQL connection failed during startup',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isReady(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  withoutTenantScope<T>(fn: () => Promise<T>): Promise<T> {
    return withoutTenantScope(fn);
  }
}
