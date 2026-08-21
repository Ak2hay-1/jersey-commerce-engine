'use client';

import Link from 'next/link';
import { useStore } from '../providers/store-provider';
import { DEFAULT_STOREFRONT_FOOTER } from '@jersey-commerce/types';
import { useState } from 'react';

function Accordion({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-foreground/15">
      <button
        type="button"
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold uppercase tracking-[0.16em]"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {title}
        <span aria-hidden="true">{open ? '–' : '+'}</span>
      </button>
      {open ? <div className="pb-5 text-sm leading-relaxed text-muted-foreground">{children}</div> : null}
    </div>
  );
}

export function StoreFooter(): React.JSX.Element {
  const store = useStore();
  const year = new Date().getFullYear();
  const footer = { ...DEFAULT_STOREFRONT_FOOTER, ...store.website.footer };
  const social = Object.entries(store.website.socialLinks).filter((entry): entry is [string, string] => Boolean(entry[1]));
  const collections = store.navigation.filter((item) => !item.parentId).slice(0, 6);
  const intro = footer.body.trim() || `${store.tenant.name} is a football jersey store — club kits, national colours, kids sizes, and custom prints built to last beyond a season.`;
  const about =
    footer.aboutBody.trim() ||
    `Welcome to ${store.tenant.name}. We focus on football jerseys only: replica-inspired club and national kits, youth sizes, and blank customs ready for name and number.`;
  const copyright = footer.copyright.trim() || `© ${year} ${store.tenant.name}. All rights reserved.`;

  return (
    <footer className="mt-10 border-t border-foreground/10 bg-foreground text-background md:mt-16">
      <div className="mx-auto max-w-store store-gutter py-12 md:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/60">{footer.kicker}</p>
        <h2 className="mt-4 max-w-3xl break-words font-heading text-[clamp(1.75rem,8vw,3.75rem)] uppercase leading-[0.95] md:text-6xl">{footer.heading}</h2>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-background/70">{intro}</p>

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <div>
            <Accordion title={footer.aboutTitle}>
              <p>{about}</p>
            </Accordion>
            <Accordion title={footer.materialsTitle}>
              <ol className="list-decimal space-y-2 pl-4">
                {footer.materials.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </Accordion>
            {footer.showCollections ? (
              <Accordion title={footer.collectionsTitle}>
                <ul className="space-y-2">
                  {collections.map((item) => (
                    <li key={item.id}>
                      <Link href={`/category/${item.slug}`} className="text-background underline-offset-4 hover:underline">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/custom-orders" className="text-background underline-offset-4 hover:underline">
                      Custom jerseys
                    </Link>
                  </li>
                </ul>
              </Accordion>
            ) : null}
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/55">{footer.shopTitle}</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/products" className="hover:underline">
                    All products
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:underline">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/account" className="hover:underline">
                    Account
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="hover:underline">
                    Cart
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/55">{footer.contactTitle}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {store.website.contactEmail ? (
                  <li>
                    <a href={`mailto:${store.website.contactEmail}`} className="hover:underline">
                      {store.website.contactEmail}
                    </a>
                  </li>
                ) : null}
                {store.website.contactPhone ? (
                  <li>
                    <a href={`tel:${store.website.contactPhone}`} className="hover:underline">
                      {store.website.contactPhone}
                    </a>
                  </li>
                ) : null}
                {social.map(([name, href]) => (
                  <li key={name}>
                    <a href={href} rel="noreferrer" className="capitalize hover:underline">
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-background/15 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] uppercase tracking-[0.16em] text-background/55">
        {copyright}
      </div>
    </footer>
  );
}
