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

  it('limits the admin portal to website, users, and settings', () => {
    const sections = filterErpNav(
      ['website.read', 'promoCodes.read', 'users.read', 'settings.read', 'dashboard.read', 'sales.read'],
      'admin',
    );
    const ids = sections.map((section) => section.id);
    expect(ids).toEqual(['website', 'users', 'settings']);
    expect(sections.flatMap((section) => section.items.map((item) => item.href))).toEqual([
      '/website',
      '/promo-codes',
      '/users',
      '/settings',
    ]);
  });

  it('hides website CMS from the ERP portal', () => {
    const sections = filterErpNav(['dashboard.read', 'website.read', 'promoCodes.read', 'users.read'], 'erp');
    const ids = sections.map((section) => section.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('users');
    expect(ids).not.toContain('website');
  });
});
