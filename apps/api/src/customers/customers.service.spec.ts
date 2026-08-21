import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerInsightsService } from './customer-insights.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('CustomersService', () => {
  const prisma = {
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sale: { count: jest.fn() },
    order: { count: jest.fn() },
    posCart: { count: jest.fn() },
    customOrder: { count: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const insights = {} as CustomerInsightsService;
  const service = new CustomersService(prisma, audit, insights);
  const actor = {
    userId: 'user-1',
    tenantId: 'tenant-a',
    email: 'owner@example.com',
    name: 'Owner',
    status: 'ACTIVE' as const,
    mustChangePassword: false,
    roles: ['OWNER' as const],
    permissions: ['customers.delete' as const],
    tokenVersion: 1,
    tenantSlug: 'a',
    tenantName: 'A',
    tokenJti: 'jti',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches by name, phone, and email', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.customer.count as jest.Mock).mockResolvedValue(0);
    (prisma.$transaction as jest.Mock).mockImplementation((ops: unknown) => Promise.all(ops as Promise<unknown>[]));
    await service.findAll('tenant-a', { search: '9876543210', page: 1, pageSize: 20 });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a', OR: expect.any(Array) }),
      }),
    );
  });

  it('throws when a duplicate phone exists and allowDuplicate is false', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([
      { id: 'c1', name: 'Rahul', phone: '9876543210', email: null, status: 'ACTIVE' },
    ]);
    await expect(
      service.create('tenant-a', { name: 'Rahul Two', phone: '9876543210' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when a duplicate email exists', async () => {
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([
      { id: 'c1', name: 'Rahul', phone: null, email: 'rahul@example.invalid', status: 'ACTIVE' },
    ]);
    await expect(
      service.create('tenant-a', { name: 'Rahul Two', email: 'Rahul@example.invalid' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deactivates customers who have sales instead of deleting them', async () => {
    (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
      id: 'c1',
      tenantId: 'tenant-a',
      name: 'Rahul',
      phone: '9876543210',
      email: null,
      status: 'ACTIVE',
      city: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (prisma.sale.count as jest.Mock).mockResolvedValue(2);
    (prisma.order.count as jest.Mock).mockResolvedValue(0);
    (prisma.posCart.count as jest.Mock).mockResolvedValue(0);
    (prisma.customOrder.count as jest.Mock).mockResolvedValue(0);
    (prisma.customer.update as jest.Mock).mockResolvedValue({});
    const result = await service.remove('tenant-a', 'c1', actor);
    expect(result).toMatchObject({ archived: true, deleted: false, status: 'INACTIVE' });
    expect(prisma.customer.delete).not.toHaveBeenCalled();
  });

  it('returns not found when the customer belongs to another tenant', async () => {
    (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.findById('tenant-a', 'other-tenant-customer')).rejects.toBeInstanceOf(NotFoundException);
  });
});
