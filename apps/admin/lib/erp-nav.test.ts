import { describe, expect, it } from 'vitest';
import {
  filterErpNav,
  filterErpNavSearchExtra,
  resolveStaffWorkspace,
  workspaceAccess,
  workspaceFromPath,
  workspaceHomePath,
} from '@jersey-commerce/types';

describe('ERP navigation', () => {
  it('shows only permissioned sections to a cashier', () => {
    const sections = filterErpNav(['dashboard.read', 'sales.read', 'inventory.read', 'pos.access']);
    const ids = sections.map((section) => section.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('orders');
    expect(ids).toContain('register');
    expect(ids).not.toContain('expenses');
    expect(ids).not.toContain('website');
    expect(ids).not.toContain('account');
    const register = sections.find((section) => section.id === 'register');
    expect(register?.items.some((item) => item.href === '/pos/' && item.external)).toBe(true);
    const reports = sections.find((section) => section.id === 'reports');
    expect(reports).toBeUndefined();
    const searchExtra = filterErpNavSearchExtra(['dashboard.read', 'sales.read', 'inventory.read', 'pos.access']);
    expect(searchExtra.some((item) => item.href === '/reports/sales')).toBeFalsy();
  });

  it('limits the admin portal to storefront, promo, users, and settings', () => {
    const sections = filterErpNav(
      ['website.read', 'promoCodes.read', 'users.read', 'settings.read', 'dashboard.read', 'sales.read', 'pos.access'],
      'admin',
    );
    const ids = sections.map((section) => section.id);
    expect(ids).toEqual(['website', 'account']);
    expect(sections.flatMap((section) => section.items.map((item) => item.href))).toEqual([
      '/website',
      '/promo-codes',
      '/users',
      '/settings',
    ]);
  });

  it('hides website CMS from the ERP portal and keeps account links', () => {
    const sections = filterErpNav(['dashboard.read', 'website.read', 'promoCodes.read', 'users.read'], 'erp');
    const ids = sections.map((section) => section.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('account');
    expect(ids).not.toContain('website');
    const account = sections.find((section) => section.id === 'account');
    expect(account?.items.map((item) => item.href)).toEqual(['/users']);
  });

  it('includes Register for POS users on the unified staff portal', () => {
    const sections = filterErpNav(['pos.access', 'sales.read'], 'all');
    const register = sections.find((section) => section.id === 'register');
    expect(register?.items.map((item) => item.href)).toEqual(['/pos/']);
    expect(register?.items[0]?.external).toBe(true);
    const orders = sections.find((section) => section.id === 'orders');
    expect(orders?.items.map((item) => item.href)).toEqual(['/sales', '/refunds']);
  });

  it('keeps individual reports and custom-order statuses searchable', () => {
    const extras = filterErpNavSearchExtra(['reports.read', 'customOrders.read', 'inventory.read']);
    expect(extras.map((item) => item.href)).toEqual(
      expect.arrayContaining([
        '/custom-orders?status=INQUIRY',
        '/custom-orders?status=QUOTATION',
        '/custom-orders?status=PRODUCTION',
        '/custom-orders?type=WHOLESALE_ORDER',
        '/reports/sales',
        '/reports/inventory',
        '/reports/activity',
      ]),
    );
  });

  it('resolves workspace access and route homes for the ERP | Website switch', () => {
    expect(workspaceAccess(['dashboard.read', 'website.read'])).toEqual({ erp: true, admin: true });
    expect(workspaceAccess(['dashboard.read', 'sales.read'])).toEqual({ erp: true, admin: false });
    expect(workspaceAccess(['website.read', 'promoCodes.read'])).toEqual({ erp: false, admin: true });
    expect(workspaceFromPath('/promo-codes/new')).toBe('admin');
    expect(workspaceFromPath('/orders')).toBe('erp');
    expect(workspaceFromPath('/users')).toBeNull();
    expect(workspaceHomePath('admin')).toBe('/website');
    expect(workspaceHomePath('erp')).toBe('/dashboard');
    expect(
      resolveStaffWorkspace({
        envPortal: 'all',
        pathname: '/settings',
        permissions: ['dashboard.read', 'website.read'],
        stored: 'admin',
      }),
    ).toBe('admin');
    expect(
      resolveStaffWorkspace({
        envPortal: 'all',
        pathname: '/website',
        permissions: ['dashboard.read', 'website.read'],
        stored: 'erp',
      }),
    ).toBe('admin');
  });
});
