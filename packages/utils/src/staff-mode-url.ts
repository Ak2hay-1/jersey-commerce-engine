export type StaffMode = 'pos' | 'erp';

export interface StaffModeUrlContext {
  origin: string;
  pathname: string;
  port: string;
  posUrlOverride?: string;
  staffUrlOverride?: string;
}

export function resolveStaffModeUrl(mode: StaffMode, ctx: StaffModeUrlContext): string {
  const { origin, pathname, port } = ctx;
  const posOverride = ctx.posUrlOverride?.trim().replace(/\/$/, '');
  const staffOverride = ctx.staffUrlOverride?.trim().replace(/\/$/, '');

  if (port === '3002') {
    return mode === 'pos'
      ? `${origin}/register/`
      : `${staffOverride ?? 'http://localhost:3001'}/dashboard`;
  }

  if (port === '3001' || port === '3003') {
    const posBase = posOverride ?? 'http://localhost:3002';
    return mode === 'pos' ? `${posBase}/register/` : `${origin}/dashboard`;
  }

  if (pathname.startsWith('/pos')) {
    return mode === 'pos' ? `${origin}/pos/` : `${origin}/dashboard`;
  }

  if (pathname.startsWith('/erp')) {
    return mode === 'pos' ? `${origin}/pos/` : `${origin}/erp/`;
  }

  if (mode === 'pos') {
    return posOverride ? `${posOverride}/` : `${origin}/pos/`;
  }

  return staffOverride ? `${staffOverride}/dashboard` : `${origin}/dashboard`;
}
