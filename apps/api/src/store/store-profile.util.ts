export function isStorefrontProfileComplete(customer: {
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}): boolean {
  return Boolean(
    customer.name.trim() &&
      customer.phone?.trim() &&
      customer.address?.trim() &&
      customer.city?.trim() &&
      customer.state?.trim() &&
      customer.postalCode?.trim(),
  );
}
