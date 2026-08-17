import type { Prisma } from './client';

/**
 * Interactive $transaction callbacks on the tenant-scoped PrismaService yield an
 * extended client whose method signatures are incompatible with
 * `Prisma.TransactionClient` in a union. Cast at the boundary so domain services
 * can share one client type.
 */
export function asTx(client: object): Prisma.TransactionClient {
  return client as Prisma.TransactionClient;
}
