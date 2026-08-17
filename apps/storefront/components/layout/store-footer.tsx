'use client';

import Link from 'next/link';
import { useStore } from '../providers/store-provider';

export function StoreFooter(): React.JSX.Element {
  const store = useStore();
  const year = new Date().getFullYear();
  const social = Object.entries(store.website.socialLinks).filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <footer className="mt-10 border-t border-border bg-background text-foreground">
      <div className="mx-auto grid max-w-store gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-heading text-xl font-extrabold uppercase tracking-[0.16em]">{store.tenant.name}</p>
          {store.tenant.legalName ? <p className="mt-2 text-sm text-muted-foreground">{store.tenant.legalName}</p> : null}
          <p className="mt-3 text-sm text-muted-foreground">
            {[store.website.contactAddress, store.tenant.city].filter(Boolean).join(', ')}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            {store.navigation.map((item) => (
              <li key={item.id}>
                <Link href={`/category/${item.slug}`} className="nav-link hover:text-accent">
                  {item.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/custom-orders" className="nav-link hover:text-accent">
                Custom jerseys
              </Link>
            </li>
            <li>
              <Link href="/products" className="nav-link hover:text-accent">
                All products
              </Link>
            </li>
            <li>
              <Link href="/account" className="nav-link hover:text-accent">
                Account
              </Link>
            </li>
            <li>
              <Link href="/cart" className="nav-link hover:text-accent">
                Cart
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contact</p>
          <ul className="mt-3 space-y-2 text-sm">
            {store.website.contactEmail ? (
              <li>
                <a href={`mailto:${store.website.contactEmail}`} className="nav-link">
                  {store.website.contactEmail}
                </a>
              </li>
            ) : null}
            {store.website.contactPhone ? (
              <li>
                <a href={`tel:${store.website.contactPhone}`} className="nav-link">
                  {store.website.contactPhone}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Follow</p>
          <ul className="mt-3 space-y-2 text-sm">
            {social.map(([name, href]) => (
              <li key={name}>
                <a href={href} rel="noreferrer" className="nav-link capitalize hover:text-accent">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {year} {store.tenant.name}. All rights reserved.
      </div>
    </footer>
  );
}
