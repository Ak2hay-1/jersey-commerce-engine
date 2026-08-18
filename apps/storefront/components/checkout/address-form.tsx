'use client';

import { Input } from '../ui/input';

export type AddressValue = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export function emptyAddress(): AddressValue {
  return {
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
  };
}

export function AddressForm({
  value,
  onChange,
}: {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}): React.JSX.Element {
  function field<K extends keyof AddressValue>(key: K) {
    return {
      value: value[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [key]: event.target.value }),
    };
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1 text-sm md:col-span-2">
        Full name
        <Input required autoComplete="name" {...field('fullName')} />
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">
        Phone
        <Input required autoComplete="tel" inputMode="tel" {...field('phone')} />
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">
        Address
        <Input required autoComplete="address-line1" {...field('addressLine1')} />
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">
        Apartment, suite (optional)
        <Input autoComplete="address-line2" {...field('addressLine2')} />
      </label>
      <label className="grid gap-1 text-sm">
        City
        <Input required autoComplete="address-level2" {...field('city')} />
      </label>
      <label className="grid gap-1 text-sm">
        State
        <Input required autoComplete="address-level1" {...field('state')} />
      </label>
      <label className="grid gap-1 text-sm">
        Postal code
        <Input required autoComplete="postal-code" {...field('postalCode')} />
      </label>
    </div>
  );
}

export function toShippingDto(value: AddressValue): {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
} {
  return {
    fullName: value.fullName,
    phone: value.phone,
    addressLine1: value.addressLine1,
    addressLine2: value.addressLine2.trim() || undefined,
    city: value.city,
    state: value.state,
    postalCode: value.postalCode,
    country: value.country || 'IN',
  };
}
