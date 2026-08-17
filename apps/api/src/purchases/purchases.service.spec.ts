import { ConflictException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { PurchaseStatus } from '../prisma/client';

describe('PurchasesService receiving and cancellation', () => {
  const tx = {
    tenant: { findFirstOrThrow: jest.fn() },
    purchase: { update: jest.fn(), findFirstOrThrow: jest.fn(), findFirst: jest.fn() },
    purchaseItem: { update: jest.fn() },
    purchaseReceipt: { create: jest.fn() },
    supplierPayment: { count: jest.fn() },
    productVariant: { findFirst: jest.fn(), update: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn(),
    purchase: { findFirst: jest.fn() },
  } as unknown as PrismaService;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const inventory = { applyPurchase: jest.fn() } as unknown as InventoryService;
  const suppliers = { requireUsable: jest.fn() } as unknown as SuppliersService;
  const service = new PurchasesService(prisma, audit, inventory, suppliers);
  const actor = {
    userId: 'user-1',
    tenantId: 'tenant-a',
    email: 'owner@example.com',
    name: 'Owner',
    status: 'ACTIVE' as const,
    roles: ['OWNER' as const],
    permissions: ['purchases.receive' as const],
    tokenVersion: 1,
    tenantSlug: 'a',
    tenantName: 'A',
    tokenJti: 'jti',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (client: typeof tx) => unknown) => fn(tx));
  });

  it('rejects receiving more than the remaining ordered quantity', async () => {
    tx.$queryRaw.mockResolvedValue([{ id: 'po-1' }]);
    tx.purchase.findFirst.mockResolvedValue({
      id: 'po-1',
      tenantId: 'tenant-a',
      status: PurchaseStatus.ORDERED,
      supplierId: 'sup-1',
      purchaseNumber: 'PO-000001',
      receivedAt: null,
      items: [
        {
          id: 'item-1',
          productVariantId: 'var-1',
          orderedQuantity: 100,
          receivedQuantity: 60,
          unitCost: { toString: () => '450.00' },
        },
      ],
    });
    tx.tenant.findFirstOrThrow.mockResolvedValue({
      allowPurchaseOverReceive: false,
      updateVariantCostOnReceive: false,
    });
    await expect(
      service.receive('tenant-a', 'po-1', { productVariantId: 'var-1', receivedQuantity: 50 }, actor),
    ).rejects.toThrow('Received quantity cannot exceed the remaining ordered quantity (40).');
    expect(inventory.applyPurchase).not.toHaveBeenCalled();
  });

  it('rolls back when inventory applyPurchase fails', async () => {
    tx.$queryRaw.mockResolvedValue([{ id: 'po-1' }]);
    tx.purchase.findFirst.mockResolvedValue({
      id: 'po-1',
      tenantId: 'tenant-a',
      status: PurchaseStatus.ORDERED,
      supplierId: 'sup-1',
      purchaseNumber: 'PO-000001',
      receivedAt: null,
      items: [
        {
          id: 'item-1',
          productVariantId: 'var-1',
          orderedQuantity: 100,
          receivedQuantity: 0,
          unitCost: { toString: () => '450.00' },
        },
      ],
    });
    tx.tenant.findFirstOrThrow.mockResolvedValue({
      allowPurchaseOverReceive: false,
      updateVariantCostOnReceive: false,
    });
    tx.purchaseReceipt.create.mockResolvedValue({ id: 'rcpt-1' });
    (inventory.applyPurchase as jest.Mock).mockRejectedValue(new Error('forced receiving failure'));
    await expect(
      service.receive('tenant-a', 'po-1', { productVariantId: 'var-1', receivedQuantity: 60 }, actor),
    ).rejects.toThrow('forced receiving failure');
  });

  it('does not cancel a received or partially received purchase', async () => {
    tx.$queryRaw.mockResolvedValue([{ id: 'po-1' }]);
    tx.purchase.findFirst.mockResolvedValue({
      id: 'po-1',
      status: PurchaseStatus.PARTIALLY_RECEIVED,
      items: [{ receivedQuantity: 20 }],
    });
    await expect(service.cancel('tenant-a', 'po-1', { reason: 'mistake' }, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
