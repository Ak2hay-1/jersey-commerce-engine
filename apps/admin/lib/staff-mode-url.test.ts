import { describe, expect, it } from 'vitest';
import { resolveStaffModeUrl } from '@jersey-commerce/utils';

describe('resolveStaffModeUrl', () => {
  it('links POS dev server to local ERP dashboard', () => {
    expect(
      resolveStaffModeUrl('erp', {
        origin: 'http://localhost:3002',
        pathname: '/register/',
        port: '3002',
      }),
    ).toBe('http://localhost:3001/dashboard');
  });

  it('links ERP dev server to local POS register', () => {
    expect(
      resolveStaffModeUrl('pos', {
        origin: 'http://localhost:3001',
        pathname: '/dashboard/',
        port: '3001',
      }),
    ).toBe('http://localhost:3002/register/');
  });

  it('links nested POS on the unified staff portal to dashboard', () => {
    expect(
      resolveStaffModeUrl('erp', {
        origin: 'https://admin.jerzyfy.in',
        pathname: '/pos/register/',
        port: '',
      }),
    ).toBe('https://admin.jerzyfy.in/dashboard');
  });

  it('links ERP on the unified staff portal to POS', () => {
    expect(
      resolveStaffModeUrl('pos', {
        origin: 'https://admin.jerzyfy.in',
        pathname: '/dashboard/',
        port: '',
      }),
    ).toBe('https://admin.jerzyfy.in/pos/');
  });

  it('links desktop renderer ERP paths to POS', () => {
    expect(
      resolveStaffModeUrl('pos', {
        origin: 'http://127.0.0.1:39217',
        pathname: '/erp/dashboard/',
        port: '39217',
      }),
    ).toBe('http://127.0.0.1:39217/pos/');
  });
});
