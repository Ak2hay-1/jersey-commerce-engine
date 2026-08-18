export const PERMISSION_CODES = [
  'products.read',
  'products.create',
  'products.update',
  'products.delete',
  'categories.read',
  'categories.create',
  'categories.update',
  'categories.delete',
  'inventory.read',
  'inventory.adjust',
  'inventory.manage',
  'sales.read',
  'sales.create',
  'sales.cancel',
  'sales.discount',
  'sales.refund',
  'payments.read',
  'payments.create',
  'payments.refund',
  'orders.read',
  'orders.create',
  'orders.update',
  'orders.cancel',
  'customers.read',
  'customers.create',
  'customers.update',
  'customers.delete',
  'customers.notes',
  'customers.tags',
  'purchases.read',
  'purchases.create',
  'purchases.update',
  'purchases.receive',
  'purchases.cancel',
  'suppliers.read',
  'suppliers.create',
  'suppliers.update',
  'suppliers.delete',
  'supplierPayments.read',
  'supplierPayments.create',
  'reports.read',
  'reports.export',
  'dashboard.read',
  'expenses.read',
  'expenses.create',
  'expenses.update',
  'expenses.delete',
  'users.read',
  'users.manage',
  'settings.read',
  'settings.manage',
  'website.read',
  'website.update',
  'pos.access',
  'pos.session.open',
  'pos.session.close',
  'customOrders.read',
  'customOrders.create',
  'customOrders.update',
  'customOrders.quote',
  'customOrders.design',
  'customOrders.approve',
  'customOrders.production',
  'customOrders.payment',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export interface PermissionDefinition {
  code: PermissionCode;
  name: string;
  description: string;
  group: string;
}

const PERMISSION_META: Partial<
  Record<PermissionCode, Pick<PermissionDefinition, 'name' | 'description' | 'group'>>
> = {
  'inventory.manage': {
    group: 'inventory',
    name: 'Manage inventory',
    description: 'Configure reorder levels and perform inventory administration for the tenant.',
  },
  'pos.access': {
    group: 'pos',
    name: 'Access POS',
    description: 'Use the point-of-sale API to manage sessions, carts, and sales.',
  },
  'pos.session.open': {
    group: 'pos',
    name: 'Open POS session',
    description: 'Open a cashier register session and record opening cash.',
  },
  'pos.session.close': {
    group: 'pos',
    name: 'Close POS session',
    description: 'Close a cashier register session and record closing cash.',
  },
  'sales.cancel': {
    group: 'sales',
    name: 'Cancel sales',
    description: 'Cancel a completed POS sale, preserve history, and reverse inventory.',
  },
  'sales.discount': {
    group: 'sales',
    name: 'Apply sales discounts',
    description: 'Apply line-level or cart-level discounts on POS sales.',
  },
  'payments.read': {
    group: 'payments',
    name: 'Read payments',
    description: 'View payment history and payment records for the tenant.',
  },
  'payments.create': {
    group: 'payments',
    name: 'Create payments',
    description: 'Record cashier-confirmed payments for sales.',
  },
  'payments.refund': {
    group: 'payments',
    name: 'Refund payments',
    description: 'Issue refunds against original payments.',
  },
  'sales.refund': {
    group: 'sales',
    name: 'Refund sales',
    description: 'Issue full or partial refunds against completed sales.',
  },
  'customers.delete': {
    group: 'customers',
    name: 'Delete customers',
    description: 'Deactivate customers with history, or delete customers who have no transactions.',
  },
  'customers.notes': {
    group: 'customers',
    name: 'Manage customer notes',
    description: 'Read and write internal staff notes on customer profiles.',
  },
  'customers.tags': {
    group: 'customers',
    name: 'Manage customer tags',
    description: 'Create reusable tags and assign or remove them on customers.',
  },
  'purchases.receive': {
    group: 'purchases',
    name: 'Receive purchases',
    description: 'Record physical receipts against ordered purchases and increase inventory.',
  },
  'purchases.cancel': {
    group: 'purchases',
    name: 'Cancel purchases',
    description: 'Cancel draft or unordered purchases that have not been received.',
  },
  'suppliers.delete': {
    group: 'suppliers',
    name: 'Delete suppliers',
    description: 'Deactivate suppliers with purchase history, or delete suppliers who have none.',
  },
  'supplierPayments.read': {
    group: 'supplierPayments',
    name: 'Read supplier payments',
    description: 'View supplier payment history and outstanding balances.',
  },
  'supplierPayments.create': {
    group: 'supplierPayments',
    name: 'Create supplier payments',
    description: 'Record payments made to suppliers against outstanding payables.',
  },
  'orders.cancel': {
    group: 'orders',
    name: 'Cancel orders',
    description: 'Cancel an ecommerce, WhatsApp, or manual order and release reserved stock.',
  },
  'customOrders.read': {
    group: 'customOrders',
    name: 'Read custom orders',
    description: 'View custom, team, and bulk jersey orders, quotes, designs, and timelines.',
  },
  'customOrders.create': {
    group: 'customOrders',
    name: 'Create custom orders',
    description: 'Create custom jersey enquiries and convert them into structured orders.',
  },
  'customOrders.update': {
    group: 'customOrders',
    name: 'Update custom orders',
    description: 'Update custom-order details, items, and limited enquiry fields.',
  },
  'customOrders.quote': {
    group: 'customOrders',
    name: 'Quote custom orders',
    description: 'Create and version quotations for custom jersey orders.',
  },
  'customOrders.design': {
    group: 'customOrders',
    name: 'Manage custom-order designs',
    description: 'Upload design versions and request customer approval.',
  },
  'customOrders.approve': {
    group: 'customOrders',
    name: 'Approve custom-order designs',
    description: 'Mark a design version as approved on behalf of the business.',
  },
  'customOrders.production': {
    group: 'customOrders',
    name: 'Manage custom-order production',
    description: 'Update production status and write internal production notes.',
  },
  'customOrders.payment': {
    group: 'customOrders',
    name: 'Record custom-order payments',
    description: 'Record deposits and balance payments against custom orders.',
  },
  'dashboard.read': {
    group: 'dashboard',
    name: 'Read dashboard',
    description: 'View the ERP dashboard. Individual widgets still require their domain permissions.',
  },
  'reports.export': {
    group: 'reports',
    name: 'Export reports',
    description: 'Download report CSV exports. Exports are audited and remain tenant-scoped.',
  },
  'expenses.read': {
    group: 'expenses',
    name: 'Read expenses',
    description: 'View expense records and expense totals for the tenant.',
  },
  'expenses.create': {
    group: 'expenses',
    name: 'Create expenses',
    description: 'Record a new operating expense.',
  },
  'expenses.update': {
    group: 'expenses',
    name: 'Update expenses',
    description: 'Edit an active expense. Historical voided expenses cannot be rewritten.',
  },
  'expenses.delete': {
    group: 'expenses',
    name: 'Void expenses',
    description: 'Void an expense. Financial history is preserved; records are not deleted.',
  },
};

export const PERMISSION_CATALOG: PermissionDefinition[] = PERMISSION_CODES.map((code) => {
  const override = PERMISSION_META[code];
  if (override) {
    return { code, ...override };
  }
  const [group, action] = code.split('.') as [string, string];
  const name = `${action[0]?.toUpperCase() ?? ''}${action.slice(1)} ${group}`;
  return {
    code,
    name,
    description: `${name} permission`,
    group,
  };
});
