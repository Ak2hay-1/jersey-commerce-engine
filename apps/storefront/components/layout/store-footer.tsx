'use client';

import Link from 'next/link';
import { useStore } from '../providers/store-provider';

export function StoreFooter(): React.JSX.Element {
  const store = useStore();
  const year = new Date().getFullYear();
  const social = Object.entries(store.website.socialLinks).filter(([, href]) => Boolean(href));

  return (
    <footer className="mt-16 border-t border-border bg-foreground text-background">
      <div className="mx-auto grid max-w-store gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-heading text-2xl uppercase tracking-wide">{store.tenant.name}</p>
          {store.tenant.legalName ? <p className="mt-2 text-sm text-background/70">{store.tenant.legalName}</p> : null}
          <p className="mt-3 text-sm text-background/70">
            {[store.website.contactAddress, store.tenant.city].filter(Boolean).join(', ')}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-background/60">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            {store.navigation.map((item) => (
              <li key={item.id}>
                <Link href={`/category/${item.slug}`} className="hover:text-accent">
                  {item.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/custom-orders" className="hover:text-accent">
                Custom jerseys
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:text-accent">
                All products
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-accent">
                Account
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-accent">
                Cart
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-background/60">Contact</p>
          <ul className="mt-3 space-y-2 text-sm">
            {store.website.contactEmail ? (
              <li>
                <a href={`mailto:${store.website.contactEmail}`}>{store.website.contactEmail}</a>
              </li>
            ) : null}
            {store.website.contactPhone ? (
              <li>
                <a href={`tel:${store.website.contactPhone}`}>{store.website.contactPhone}</a>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-background/60">Follow</p>
          <ul className="mt-3 space-y-2 text-sm">
            {social.map(([name, href]) => (
              <li key={name}>
                <a href={href} rel="noreferrer" className="capitalize hover:text-accent">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-background/10 py-4 text-center text-xs text-background/60">
        © {year} {store.tenant.name}. All rights reserved.
      </div>
    </footer>
  );
}
