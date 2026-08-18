import { filterErpNav } from '@jersey-commerce/types';

describe('filterErpNav', () => {
  it('hides financial report and expense sections from cashiers', () => {
    const sections = filterErpNav([
      'dashboard.read',
      'sales.read',
      'orders.read',
      'payments.read',
      'products.read',
      'customers.read',
      'inventory.read',
      'pos.access',
    ]);
    const ids = sections.map((section) => section.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('sales');
    expect(ids).not.toContain('expenses');
    const reports = sections.find((section) => section.id === 'reports');
    expect(reports?.items.some((item) => item.href === '/reports/sales')).toBe(false);
    expect(reports?.items.some((item) => item.href === '/reports/expenses')).toBe(false);
    expect(ids).not.toContain('users');
  });

  it('shows inventory and purchasing for inventory managers without expenses', () => {
    const sections = filterErpNav([
      'dashboard.read',
      'inventory.read',
      'purchases.read',
      'suppliers.read',
      'supplierPayments.read',
      'products.read',
    ]);
    expect(sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(['dashboard', 'inventory', 'purchasing', 'products']),
    );
    expect(sections.map((section) => section.id)).not.toContain('expenses');
  });
});
