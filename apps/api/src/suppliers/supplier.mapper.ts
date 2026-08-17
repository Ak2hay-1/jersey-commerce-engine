import type { SupplierStatus } from '@jersey-commerce/types';

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toSupplierDto(record: {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  taxInformation: string | null;
  notes: string | null;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    name: record.name,
    contactPerson: record.contactPerson,
    phone: record.phone,
    email: record.email,
    address: record.address,
    city: record.city,
    state: record.state,
    postalCode: record.postalCode,
    taxInformation: record.taxInformation,
    notes: record.notes,
    status: record.status,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  };
}
