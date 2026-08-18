import { describe, expect, it } from 'vitest';
import { filterErpNav } from '@jersey-commerce/types';

describe('ERP navigation', () => {
  it('shows only permissioned sections to a cashier', () => {
    const sections = filterErpNav(['dashboard.read', 'sales.read', 'inventory.read']);
    const ids = sections.map((section) => section.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('sales');
    expect(ids).not.toContain('expenses');
    expect(ids).not.toContain('users');
    const reports = sections.find((section) => section.id === 'reports');
    expect(reports?.items.some((item) => item.href === '/reports/sales')).toBeFalsy();
  });
});
