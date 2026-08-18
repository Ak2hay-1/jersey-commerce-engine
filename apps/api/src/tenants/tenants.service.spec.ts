import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TenantsService', () => {
  const prisma = {
    $transaction: jest.fn(),
    tenant: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  } as unknown as PrismaService;
  const service = new TenantsService(prisma);

  it('returns paginated tenant summaries', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [{ id: 't1', slug: 'demo-jersey-store', name: 'Demo Jersey Store', status: 'ACTIVE' }],
      1,
    ]);
    const result = await service.findAll({ page: 1, pageSize: 20 });
    expect(result.meta.totalItems).toBe(1);
    expect(result.items[0]?.slug).toBe('demo-jersey-store');
  });

  it('throws RESOURCE_NOT_FOUND for unknown tenants', async () => {
    (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
