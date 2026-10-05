'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';
import { useAuth } from '../providers/auth-provider';
import { useStore } from '../providers/store-provider';
import { storeApi } from '../../lib/api';
import { publicErrorMessage } from '../../lib/errors';
import { isProfileComplete } from '../../lib/profile';

type ProfileFormMode = 'edit' | 'complete';

export function ProfileForm({ mode = 'edit' }: { mode?: ProfileFormMode }): React.JSX.Element {
  const router = useRouter();
  const store = useStore();
  const { customer, setCustomer } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const shopName = store.tenant.name.trim() || 'Jerzyfy';
  const completing = mode === 'complete';

  useEffect(() => {
    if (completing && customer && isProfileComplete(customer)) {
      router.replace('/account');
    }
  }, [completing, customer, router]);

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
      if (completing) {
        router.replace('/account');
        router.refresh();
        return;
      }
      setSaved(true);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not save profile.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel w-full max-w-2xl space-y-4 p-5 sm:p-8">
      <div className="space-y-1">
        <p className="section-kicker">{shopName}</p>
        <h1 className="font-display pt-1 text-[clamp(2.25rem,5vw,3rem)]">
          {completing ? 'Complete profile' : 'Profile'}
        </h1>
        {completing ? (
          <p className="pt-2 text-sm text-muted-foreground">
            Add your name, phone, and delivery details to finish creating your account.
          </p>
        ) : null}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {!completing && saved ? <Alert tone="success">Profile saved.</Alert> : null}
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Name
        <Input name="name" defaultValue={customer.name} required />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Email
        <Input name="email" type="email" defaultValue={customer.email ?? ''} />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Phone
        <Input name="phone" defaultValue={customer.phone ?? ''} autoComplete="tel" inputMode="tel" required={completing} />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Address
        <Input name="address" defaultValue={customer.address ?? ''} autoComplete="address-line1" required={completing} />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        City
        <Input name="city" defaultValue={customer.city ?? ''} autoComplete="address-level2" required={completing} />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        State
        <Input name="state" defaultValue={customer.state ?? ''} autoComplete="address-level1" required={completing} />
      </label>
      <label className="grid gap-1.5 text-sm text-muted-foreground">
        Postal code
        <Input name="postalCode" defaultValue={customer.postalCode ?? ''} autoComplete="postal-code" required={completing} />
      </label>
      <button type="submit" className="btn btn-lg btn-primary w-full cursor-pointer" disabled={pending}>
        {pending ? 'Saving…' : completing ? 'Save and continue' : 'Save'}
      </button>
    </form>
  );
}
