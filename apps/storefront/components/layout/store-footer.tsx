'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '../providers/store-provider';

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
  const social = Object.entries(store.website.socialLinks).filter((entry): entry is [string, string] => Boolean(entry[1]));
  const collections = store.navigation.filter((item) => !item.parentId).slice(0, 6);

  return (
    <footer className="mt-16 border-t border-foreground/10 bg-foreground text-background">
      <div className="mx-auto max-w-store px-4 py-16 md:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/60">Crafting your identity</p>
        <h2 className="mt-4 max-w-3xl font-heading text-4xl uppercase leading-[0.95] md:text-6xl">
          Style is a reflection of the journey — on the street and on the pitch.
        </h2>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-background/70">
          {store.tenant.name} is the platform where quality meets identity. Oversized drops, match kits, and pieces built
          to last beyond a season.
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <div>
            <Accordion title="About us">
              <p>
                Welcome to {store.tenant.name}. Stop fitting in. Start standing out. We make premium streetwear and
                match-day kits for people who want exclusivity without sacrificing fabric, fit, or finish.
              </p>
            </Accordion>
            <Accordion title="What materials we use">
              <ol className="list-decimal space-y-2 pl-4">
                <li>Heavyweight cotton and French terry for oversized tees.</li>
                <li>Breathable knits for replica-inspired match kits.</li>
                <li>Low-impact dyes and non-toxic prints wherever possible.</li>
                <li>Pieces built to be worn hard, washed often, and kept.</li>
              </ol>
            </Accordion>
            <Accordion title="Featured collections">
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
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/55">Shop</p>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/55">Contact</p>
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
      <div className="border-t border-background/15 py-4 text-center text-[11px] uppercase tracking-[0.16em] text-background/55">
        © {year} {store.tenant.name}. All rights reserved.
      </div>
    </footer>
  );
}
