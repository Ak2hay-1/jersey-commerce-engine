'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@jersey-commerce/ui';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';
import { useAuth } from '../providers/auth-provider';
import { storeApi } from '../../lib/api';
import { publicErrorMessage } from '../../lib/errors';

export function ProfileForm(): React.JSX.Element {
  const { customer, setCustomer } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  if (!customer) {
    return <></>;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await storeApi.updateProfile({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? '') || undefined,
        phone: String(form.get('phone') ?? '') || null,
        address: String(form.get('address') ?? '') || null,
        city: String(form.get('city') ?? '') || null,
        state: String(form.get('state') ?? '') || null,
        postalCode: String(form.get('postalCode') ?? '') || null,
      });
      setCustomer(updated);
      setSaved(true);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not save profile.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <h1 className="font-heading text-4xl uppercase tracking-wide">Profile</h1>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {saved ? <Alert tone="success">Profile saved.</Alert> : null}
      <label className="grid gap-1 text-sm">
        Name
        <Input name="name" defaultValue={customer.name} required />
      </label>
      <label className="grid gap-1 text-sm">
        Email
        <Input name="email" type="email" defaultValue={customer.email ?? ''} />
      </label>
      <label className="grid gap-1 text-sm">
        Phone
        <Input name="phone" defaultValue={customer.phone ?? ''} />
      </label>
      <label className="grid gap-1 text-sm">
        Address
        <Input name="address" defaultValue={customer.address ?? ''} />
      </label>
      <label className="grid gap-1 text-sm">
        City
        <Input name="city" defaultValue={customer.city ?? ''} />
      </label>
      <label className="grid gap-1 text-sm">
        State
        <Input name="state" defaultValue={customer.state ?? ''} />
      </label>
      <label className="grid gap-1 text-sm">
        Postal code
        <Input name="postalCode" defaultValue={customer.postalCode ?? ''} />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
