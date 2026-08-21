import { NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('SuppliersService', () => {
  const prisma = {
    supplier: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    purchase: { count: jest.fn(), aggregate: jest.fn() },
    supplierPayment: { aggregate: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const service = new SuppliersService(prisma, audit);
  const actor = {
    userId: 'user-1',
    tenantId: 'tenant-a',
    email: 'owner@example.com',
    name: 'Owner',
    status: 'ACTIVE' as const,
    mustChangePassword: false,
    roles: ['OWNER' as const],
    permissions: ['suppliers.delete' as const],
    tokenVersion: 1,
    tenantSlug: 'a',
    tenantName: 'A',
    tokenJti: 'jti',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches by name, contact person, phone, and email', async () => {
    (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.supplier.count as jest.Mock).mockResolvedValue(0);
    (prisma.$transaction as jest.Mock).mockImplementation((ops: unknown) => Promise.all(ops as Promise<unknown>[]));
    await service.findAll('tenant-a', { search: 'Premium', page: 1, pageSize: 20 });
    expect(prisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a', OR: expect.any(Array) }),
      }),
    );
  });

  it('scopes every query to the authenticated tenant', async () => {
    (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.findById('tenant-a', 'sup-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.supplier.findFirst).toHaveBeenCalledWith({ where: { id: 'sup-1', tenantId: 'tenant-a' } });
  });

  it('deactivates suppliers who have purchases instead of deleting them', async () => {
    (prisma.supplier.findFirst as jest.Mock).mockResolvedValue({
      id: 'sup-1',
      tenantId: 'tenant-a',
      name: 'Premium Sports Suppliers',
      status: 'ACTIVE',
    });
    (prisma.purchase.count as jest.Mock).mockResolvedValue(2);
    (prisma.supplier.update as jest.Mock).mockResolvedValue({
      id: 'sup-1',
      tenantId: 'tenant-a',
      name: 'Premium Sports Suppliers',
      contactPerson: null,
      phone: null,
      email: null,
      address: null,
      city: null,
      state: null,
      postalCode: null,
      taxInformation: null,
      notes: null,
      status: 'INACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await service.remove('tenant-a', 'sup-1', actor);
    expect(prisma.supplier.delete).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ archived: true, status: 'INACTIVE' }));
  });
});
