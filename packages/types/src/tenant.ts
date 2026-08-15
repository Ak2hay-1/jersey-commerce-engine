import type { TenantStatus } from './enums';

/**
 * Tenant is the root isolation boundary for multi-business support.
 * Application code must not hard-code shop identity; tenant records own that data.
 */
export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  timezone: string;
  currency: string;
  status: TenantStatus;
}
