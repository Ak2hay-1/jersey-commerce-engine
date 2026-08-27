import type { StorefrontCustomer } from '@jersey-commerce/types';

export function isProfileComplete(
  customer: Pick<StorefrontCustomer, 'phone' | 'address' | 'city' | 'state' | 'postalCode'>,
): boolean {
  return Boolean(
    customer.phone?.trim() &&
      customer.address?.trim() &&
      customer.city?.trim() &&
      customer.state?.trim() &&
      customer.postalCode?.trim(),
  );
}

export const COMPLETE_PROFILE_PATH = '/auth/complete-profile';
