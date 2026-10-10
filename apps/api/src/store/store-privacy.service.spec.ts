import { ConflictException } from '@nestjs/common';
import { StorePrivacyService, ERASED_CUSTOMER_NAME } from './store-privacy.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';

function buildPrisma(overrides: { openOrders?: number; openCustomOrders?: number } = {}) {
  const prisma = {
    customer: {
      findFirst: jest.fn().mockResolvedValue({ id: 'cust_1' }),
      updateMany: jest.fn().mockReturnValue('customer.updateMany'),
    },
    order: { count: jest.fn().mockResolvedValue(overrides.openOrders ?? 0) },
    customOrder: { count: jest.fn().mockResolvedValue(overrides.openCustomOrders ?? 0) },
    customerIdentity: { deleteMany: jest.fn().mockReturnValue('identity.deleteMany') },
    customerPreference: { updateMany: jest.fn().mockReturnValue('preference.updateMany') },
    customerNote: { deleteMany: jest.fn().mockReturnValue('note.deleteMany') },
    customerTag: { deleteMany: jest.fn().mockReturnValue('tag.deleteMany') },
    cart: { updateMany: jest.fn().mockReturnValue('cart.updateMany') },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return prisma;
}

describe('StorePrivacyService.erase', () => {
  it('anonymises the customer and audits the erasure', async () => {
    const prisma = buildPrisma();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new StorePrivacyService(prisma as never, audit as never);

    await expect(service.erase('tenant_1', 'cust_1', { ipAddress: '1.2.3.4' })).resolves.toEqual({ erased: true });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'cust_1', tenantId: 'tenant_1' },
      data: expect.objectContaining({
        name: ERASED_CUSTOMER_NAME,
        email: null,
        phone: null,
        passwordHash: null,
        status: 'INACTIVE',
      }),
    });
    expect(prisma.customerIdentity.deleteMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant_1', customerId: 'cust_1' } });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: AUDIT_ACTIONS.CUSTOMER_ERASED, entityId: 'cust_1', ipAddress: '1.2.3.4' }),
    );
  });

  it('refuses while orders are still in progress', async () => {
    const prisma = buildPrisma({ openOrders: 1 });
    const audit = { log: jest.fn() };
    const service = new StorePrivacyService(prisma as never, audit as never);

    await expect(service.erase('tenant_1', 'cust_1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});
