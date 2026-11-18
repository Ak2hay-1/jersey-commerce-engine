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

/** In-app workspace within the unified staff portal (maps to portal filter erp | admin). */
export type StaffWorkspace = 'erp' | 'admin';

export const STAFF_WORKSPACE_STORAGE_KEY = 'jerzyfy.staffWorkspace';

export const ERP_NAV: ErpNavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [{ href: '/dashboard', label: 'Dashboard', permission: 'dashboard.read', portal: 'erp' }],
  },
  {
    id: 'register',
    label: 'Register',
    items: [{ href: '/pos/', label: 'Open Register', permission: 'pos.access', portal: 'erp', external: true }],
  },
  {
    id: 'orders',
    label: 'Orders',
    items: [
      { href: '/orders', label: 'Orders', permission: 'orders.read', portal: 'erp' },
      { href: '/sales', label: 'POS Sales', permission: 'sales.read', portal: 'erp' },
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
      { href: '/inventory/low-stock', label: 'Low Stock', permission: 'inventory.read', portal: 'erp' },
      { href: '/inventory/movements', label: 'Movements', permission: 'inventory.read', portal: 'erp' },
      { href: '/warehouses', label: 'Warehouses', permission: 'inventory.read', portal: 'erp' },
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
    items: [{ href: '/custom-orders', label: 'Custom Orders', permission: 'customOrders.read', portal: 'erp' }],
  },
  {
    id: 'purchases',
    label: 'Purchases',
    items: [
      { href: '/suppliers', label: 'Suppliers', permission: 'suppliers.read', portal: 'erp' },
      { href: '/purchases', label: 'Purchases', permission: 'purchases.read', portal: 'erp' },
      { href: '/purchases/payments', label: 'Supplier Payments', permission: 'supplierPayments.read', portal: 'erp' },
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
    items: [{ href: '/reports', label: 'Reports', permission: 'reports.read', portal: 'erp' }],
  },
  {
    id: 'website',
    label: 'Website',
    items: [
      { href: '/website', label: 'Storefront', permission: 'website.read', portal: 'admin' },
      { href: '/promo-codes', label: 'Promo codes', permission: 'promoCodes.read', portal: 'admin' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { href: '/users', label: 'Users & Roles', permission: 'users.read', portal: 'both' },
      { href: '/settings', label: 'Settings', permission: 'settings.read', portal: 'both' },
    ],
  },
];

/** Pages reachable from in-page filters/landing hubs; kept searchable after sidebar collapse. */
export const ERP_NAV_SEARCH_EXTRA: ErpNavItem[] = [
  { href: '/custom-orders?status=INQUIRY', label: 'Enquiries', permission: 'customOrders.read', portal: 'erp' },
  { href: '/custom-orders?status=QUOTATION', label: 'Quotes', permission: 'customOrders.read', portal: 'erp' },
  { href: '/custom-orders?status=PRODUCTION', label: 'Production', permission: 'customOrders.read', portal: 'erp' },
  { href: '/custom-orders?type=WHOLESALE_ORDER', label: 'Wholesale', permission: 'customOrders.read', portal: 'erp' },
  { href: '/reports/sales', label: 'Sales report', permission: 'reports.read', portal: 'erp' },
  { href: '/reports/inventory', label: 'Inventory report', permission: 'inventory.read', portal: 'erp' },
  { href: '/reports/purchases', label: 'Purchases report', permission: 'purchases.read', portal: 'erp' },
  { href: '/reports/customers', label: 'Customers report', permission: 'customers.read', portal: 'erp' },
  { href: '/reports/payments', label: 'Payments report', permission: 'payments.read', portal: 'erp' },
  { href: '/reports/expenses', label: 'Expenses report', permission: 'expenses.read', portal: 'erp' },
  { href: '/reports/custom-orders', label: 'Custom Orders report', permission: 'customOrders.read', portal: 'erp' },
  { href: '/reports/activity', label: 'Activity log', permission: 'reports.read', portal: 'erp' },
];

function matchesPortal(item: ErpNavItem, portal: StaffPortal): boolean {
  if (portal === 'all') {
    return true;
  }
  const itemPortal = item.portal ?? 'both';
  return itemPortal === 'both' || itemPortal === portal;
}

function itemAllowed(
  item: ErpNavItem,
  allowed: ReadonlySet<PermissionCode>,
  portal: StaffPortal,
): boolean {
  return allowed.has(item.permission) && matchesPortal(item, portal);
}

export function filterErpNav(
  permissions: readonly PermissionCode[],
  portal: StaffPortal = 'all',
): ErpNavSection[] {
  const allowed = new Set(permissions);
  return ERP_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => itemAllowed(item, allowed, portal)),
  })).filter((section) => section.items.length > 0);
}

export function filterErpNavSearchExtra(
  permissions: readonly PermissionCode[],
  portal: StaffPortal = 'all',
): ErpNavItem[] {
  const allowed = new Set(permissions);
  return ERP_NAV_SEARCH_EXTRA.filter((item) => itemAllowed(item, allowed, portal));
}

export function staffHomePath(portal: StaffPortal, permissions: readonly PermissionCode[]): string {
  const sections = filterErpNav(permissions, portal);
  const preferred =
    sections.find((section) => section.id !== 'register' && section.id !== 'account') ?? sections[0];
  return preferred?.items[0]?.href ?? (portal === 'admin' ? '/website' : '/dashboard');
}

export function workspaceHomePath(workspace: StaffWorkspace): string {
  return workspace === 'admin' ? '/website' : '/dashboard';
}

export function isWebsitePath(pathname: string): boolean {
  return (
    pathname === '/website' ||
    pathname.startsWith('/website/') ||
    pathname === '/promo-codes' ||
    pathname.startsWith('/promo-codes/')
  );
}

export function isSharedStaffPath(pathname: string): boolean {
  return (
    pathname === '/users' ||
    pathname.startsWith('/users/') ||
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    pathname === '/change-password' ||
    pathname.startsWith('/change-password/')
  );
}

/** Infer workspace from route. Shared paths return null so the current choice is kept. */
export function workspaceFromPath(pathname: string): StaffWorkspace | null {
  if (isWebsitePath(pathname)) {
    return 'admin';
  }
  if (isSharedStaffPath(pathname)) {
    return null;
  }
  return 'erp';
}

function hasExclusivePortalItems(
  permissions: readonly PermissionCode[],
  portal: 'erp' | 'admin',
): boolean {
  const allowed = new Set(permissions);
  return ERP_NAV.some((section) =>
    section.items.some(
      (item) => item.portal === portal && allowed.has(item.permission),
    ),
  );
}

export function workspaceAccess(permissions: readonly PermissionCode[]): {
  erp: boolean;
  admin: boolean;
} {
  return {
    erp: hasExclusivePortalItems(permissions, 'erp'),
    admin: hasExclusivePortalItems(permissions, 'admin'),
  };
}

export function resolveStaffWorkspace(input: {
  envPortal: StaffPortal;
  pathname: string;
  permissions: readonly PermissionCode[];
  stored: StaffWorkspace | null;
}): StaffWorkspace {
  const access = workspaceAccess(input.permissions);
  if (input.envPortal === 'admin') {
    return 'admin';
  }
  if (input.envPortal === 'erp') {
    return 'erp';
  }
  if (access.erp && !access.admin) {
    return 'erp';
  }
  if (access.admin && !access.erp) {
    return 'admin';
  }
  const fromPath = workspaceFromPath(input.pathname);
  if (fromPath) {
    return fromPath;
  }
  if (input.stored) {
    return input.stored;
  }
  return access.admin && !access.erp ? 'admin' : 'erp';
}
