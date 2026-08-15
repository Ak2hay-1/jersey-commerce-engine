'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@jersey-commerce/ui';
import { Input } from '../ui/input';
import { STORE_COOKIES, writeBrowserCookie } from '../../lib/cookies';

export function TenantSwitcher(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = String(new FormData(event.currentTarget).get('slug') ?? '').trim().toLowerCase();
    if (!slug) {
      return;
    }
    writeBrowserCookie(STORE_COOKIES.tenant, slug, 60 * 60 * 24 * 365);
    window.location.href = `/?tenant=${encodeURIComponent(slug)}`;
  }

  return (
    <div className="fixed bottom-3 left-3 z-50">
      {open ? (
        <form onSubmit={onSubmit} className="flex gap-2 border border-border bg-background p-2 shadow-card">
          <Input name="slug" placeholder="tenant slug" className="h-9 w-40" aria-label="Tenant slug" />
          <Button type="submit" size="sm">
            Load
          </Button>
        </form>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Tenant
        </Button>
      )}
    </div>
  );
}
