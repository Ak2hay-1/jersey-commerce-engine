import type {
  CustomerNoteDto,
  CustomerPreferenceDto,
  CustomerProfile,
  CustomerSummary,
  CustomerTagDto,
} from '@jersey-commerce/types';
import type { CustomerSegment, CustomerStatus } from '@jersey-commerce/types';
import type { CustomerMetricsDto } from '@jersey-commerce/types';

export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toCustomerSummary(record: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: CustomerStatus;
  city?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CustomerSummary {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    email: record.email,
    status: record.status,
    city: record.city ?? null,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  };
}

export function toPreferenceDto(record?: {
  emailOptIn: boolean;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
} | null): CustomerPreferenceDto {
  return {
    emailOptIn: record?.emailOptIn ?? false,
    smsOptIn: record?.smsOptIn ?? false,
    whatsappOptIn: record?.whatsappOptIn ?? false,
  };
}

export function toTagDto(record: { id: string; name: string; slug: string }): CustomerTagDto {
  return { id: record.id, name: record.name, slug: record.slug };
}

export function toCustomerProfile(input: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  notes: string | null;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
  preference?: { emailOptIn: boolean; smsOptIn: boolean; whatsappOptIn: boolean } | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  metrics: CustomerMetricsDto;
  segments: CustomerSegment[];
  primarySegment: CustomerSegment | null;
}): CustomerProfile {
  return {
    ...toCustomerSummary(input),
    address: input.address,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    notes: input.notes,
    preference: toPreferenceDto(input.preference),
    tags: input.tags.map(toTagDto),
    metrics: input.metrics,
    segments: input.segments,
    primarySegment: input.primarySegment,
  };
}

export function toNoteDto(record: {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
}): CustomerNoteDto {
  return {
    id: record.id,
    body: record.body,
    createdBy: { id: record.author.id, name: record.author.name },
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  };
}
