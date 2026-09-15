import { flattenUniqueWhere } from './tenant-extension';

describe('flattenUniqueWhere', () => {
  it('keeps a simple id where and injects tenantId', () => {
    expect(flattenUniqueWhere({ id: 'ord_1' }, 'tenant_a')).toEqual({
      id: 'ord_1',
      tenantId: 'tenant_a',
    });
  });

  it('flattens compound unique bags used by update where', () => {
    expect(
      flattenUniqueWhere(
        {
          tenantId_keyHash: { tenantId: 'tenant_a', keyHash: 'abc' },
        },
        'tenant_a',
      ),
    ).toEqual({
      tenantId: 'tenant_a',
      keyHash: 'abc',
    });
  });
});
