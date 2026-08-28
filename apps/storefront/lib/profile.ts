import type { StorefrontCustomer } from '@jersey-commerce/types';

export function isProfileComplete(
  customer: Pick<StorefrontCustomer, 'name' | 'phone' | 'address' | 'city' | 'state' | 'postalCode'>,
): boolean {
  return Boolean(
    customer.name?.trim() &&
      customer.phone?.trim() &&
      customer.address?.trim() &&
      customer.city?.trim() &&
      customer.state?.trim() &&
      customer.postalCode?.trim(),
  );
}

export const COMPLETE_PROFILE_PATH = '/auth/complete-profile';
