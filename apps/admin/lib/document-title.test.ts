import { describe, expect, it } from 'vitest';
import { adminTitleForPath, formatAdminDocumentTitle } from './document-title';

describe('admin document titles', () => {
  it('maps ERP nav routes to specific labels', () => {
    expect(adminTitleForPath('/orders')).toBe('Orders');
    expect(adminTitleForPath('/dashboard')).toBe('Dashboard');
    expect(adminTitleForPath('/reports/sales')).toBe('Sales report');
    expect(adminTitleForPath('/products/abc')).toBe('Products');
  });

  it('formats the browser title suffix', () => {
    expect(formatAdminDocumentTitle('/orders')).toBe('Orders · Jerzyfy Admin');
    expect(formatAdminDocumentTitle('/login')).toBe('Login · Jerzyfy Admin');
  });
});
