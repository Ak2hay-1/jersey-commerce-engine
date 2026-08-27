import type { PermissionCode } from './permissions';
import type { StaffPortal } from './enums';

export interface ErpNavItem {
  href: string;
  label: string;
  permission: PermissionCode;
  /** Defaults to both staff portals when omitted. */
  portal?: 'admin' | 'erp' | 'both';
  /** Full page navigation (e.g. nested POS SPA under /pos). */
  external?: boolean;
}

export interface ErpNavSection {
  id: string;
  label: string;
  items: ErpNavItem[];
}

export const ERP_NAV: ErpNavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [{ href: '/dashboard', label: 'Dashboard', permission: 'dashboard.read', portal: 'erp' }],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { href: '/pos/', label: 'Register', permission: 'pos.access', portal: 'erp', external: true },
      { href: '/sales', label: 'POS Sales', permission: 'sales.read', portal: 'erp' },
      { href: '/orders', label: 'Orders', permission: 'orders.read', portal: 'erp' },
      { href: '/payments', label: 'Payments', permission: 'payments.read', portal: 'erp' },
      { href: '/refunds', label: 'Refunds', permission: 'sales.read', portal: 'erp' },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    items: [
      { href: '/products', label: 'Products', permission: 'products.read', portal: 'erp' },
      { href: '/categories', label: 'Categories', permission: 'categories.read', portal: 'erp' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { href: '/inventory', label: 'Stock', permission: 'inventory.read', portal: 'erp' },
      { href: '/inventory/movements', label: 'Movements', permission: 'inventory.read', portal: 'erp' },
      { href: '/inventory/low-stock', label: 'Low Stock', permission: 'inventory.read', portal: 'erp' },
    ],
  },
  {
    id: 'purchasing',
    label: 'Purchasing',
    items: [
      { href: '/suppliers', label: 'Suppliers', permission: 'suppliers.read', portal: 'erp' },
      { href: '/purchases', label: 'Purchases', permission: 'purchases.read', portal: 'erp' },
      { href: '/purchases/payments', label: 'Supplier Payments', permission: 'supplierPayments.read', portal: 'erp' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    items: [
      { href: '/customers', label: 'Customers', permission: 'customers.read', portal: 'erp' },
      { href: '/customers/segments', label: 'Segments', permission: 'customers.read', portal: 'erp' },
    ],
  },
  {
    id: 'custom-orders',
    label: 'Custom Orders',
    items: [
      { href: '/custom-orders?status=INQUIRY', label: 'Enquiries', permission: 'customOrders.read', portal: 'erp' },
      { href: '/custom-orders?status=QUOTATION', label: 'Quotes', permission: 'customOrders.read', portal: 'erp' },
      { href: '/custom-orders?status=PRODUCTION', label: 'Production', permission: 'customOrders.read', portal: 'erp' },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    items: [{ href: '/expenses', label: 'Expenses', permission: 'expenses.read', portal: 'erp' }],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      { href: '/reports', label: 'Reports', permission: 'reports.read', portal: 'erp' },
      { href: '/reports/sales', label: 'Sales', permission: 'reports.read', portal: 'erp' },
      { href: '/reports/inventory', label: 'Inventory', permission: 'inventory.read', portal: 'erp' },
      { href: '/reports/purchases', label: 'Purchases', permission: 'purchases.read', portal: 'erp' },
      { href: '/reports/customers', label: 'Customers', permission: 'customers.read', portal: 'erp' },
      { href: '/reports/payments', label: 'Payments', permission: 'payments.read', portal: 'erp' },
      { href: '/reports/expenses', label: 'Expenses', permission: 'expenses.read', portal: 'erp' },
      { href: '/reports/custom-orders', label: 'Custom Orders', permission: 'customOrders.read', portal: 'erp' },
    ],
  },
  {
    id: 'website',
    label: 'Storefront',
    items: [
      { href: '/website', label: 'Customize', permission: 'website.read', portal: 'admin' },
      { href: '/promo-codes', label: 'Promo codes', permission: 'promoCodes.read', portal: 'admin' },
    ],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    items: [{ href: '/users', label: 'Users & Roles', permission: 'users.read', portal: 'both' }],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [{ href: '/settings', label: 'Settings', permission: 'settings.read', portal: 'both' }],
  },
];

function matchesPortal(item: ErpNavItem, portal: StaffPortal): boolean {
  if (portal === 'all') {
    return true;
  }
  const itemPortal = item.portal ?? 'both';
  return itemPortal === 'both' || itemPortal === portal;
}

export function filterErpNav(
  permissions: readonly PermissionCode[],
  portal: StaffPortal = 'all',
): ErpNavSection[] {
  const allowed = new Set(permissions);
  return ERP_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => allowed.has(item.permission) && matchesPortal(item, portal)),
  })).filter((section) => section.items.length > 0);
}

export function staffHomePath(portal: StaffPortal, permissions: readonly PermissionCode[]): string {
  const sections = filterErpNav(permissions, portal);
  return sections[0]?.items[0]?.href ?? (portal === 'admin' ? '/website' : '/dashboard');
}
