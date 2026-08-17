import type { PermissionCode } from './permissions';

export interface ErpNavItem {
  href: string;
  label: string;
  permission: PermissionCode;
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
    items: [{ href: '/dashboard', label: 'Dashboard', permission: 'dashboard.read' }],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { href: '/sales', label: 'POS Sales', permission: 'sales.read' },
      { href: '/orders', label: 'Orders', permission: 'orders.read' },
      { href: '/payments', label: 'Payments', permission: 'payments.read' },
      { href: '/refunds', label: 'Refunds', permission: 'sales.read' },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    items: [
      { href: '/products', label: 'Products', permission: 'products.read' },
      { href: '/categories', label: 'Categories', permission: 'categories.read' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { href: '/inventory', label: 'Stock', permission: 'inventory.read' },
      { href: '/inventory/movements', label: 'Movements', permission: 'inventory.read' },
      { href: '/inventory/low-stock', label: 'Low Stock', permission: 'inventory.read' },
    ],
  },
  {
    id: 'purchasing',
    label: 'Purchasing',
    items: [
      { href: '/suppliers', label: 'Suppliers', permission: 'suppliers.read' },
      { href: '/purchases', label: 'Purchases', permission: 'purchases.read' },
      { href: '/purchases/payments', label: 'Supplier Payments', permission: 'supplierPayments.read' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    items: [
      { href: '/customers', label: 'Customers', permission: 'customers.read' },
      { href: '/customers/segments', label: 'Segments', permission: 'customers.read' },
    ],
  },
  {
    id: 'custom-orders',
    label: 'Custom Orders',
    items: [
      { href: '/custom-orders?status=INQUIRY', label: 'Enquiries', permission: 'customOrders.read' },
      { href: '/custom-orders?status=QUOTATION', label: 'Quotes', permission: 'customOrders.read' },
      { href: '/custom-orders?status=PRODUCTION', label: 'Production', permission: 'customOrders.read' },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    items: [{ href: '/expenses', label: 'Expenses', permission: 'expenses.read' }],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      { href: '/reports', label: 'Reports', permission: 'reports.read' },
      { href: '/reports/sales', label: 'Sales', permission: 'reports.read' },
      { href: '/reports/inventory', label: 'Inventory', permission: 'inventory.read' },
      { href: '/reports/purchases', label: 'Purchases', permission: 'purchases.read' },
      { href: '/reports/customers', label: 'Customers', permission: 'customers.read' },
      { href: '/reports/payments', label: 'Payments', permission: 'payments.read' },
      { href: '/reports/expenses', label: 'Expenses', permission: 'expenses.read' },
      { href: '/reports/custom-orders', label: 'Custom Orders', permission: 'customOrders.read' },
    ],
  },
  {
    id: 'website',
    label: 'Website',
    items: [{ href: '/website', label: 'Website', permission: 'website.read' }],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    items: [{ href: '/users', label: 'Users & Roles', permission: 'users.read' }],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [{ href: '/settings', label: 'Settings', permission: 'settings.read' }],
  },
];

export function filterErpNav(permissions: readonly PermissionCode[]): ErpNavSection[] {
  const allowed = new Set(permissions);
  return ERP_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => allowed.has(item.permission)),
  })).filter((section) => section.items.length > 0);
}
