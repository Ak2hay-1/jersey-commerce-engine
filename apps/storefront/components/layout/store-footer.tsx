'use client';

import Link from 'next/link';
import { ArrowUpRight, Facebook, Instagram, MessageCircle, Twitter, Youtube } from 'lucide-react';
import { useStore } from '../providers/store-provider';
import { DEFAULT_STOREFRONT_FOOTER, type StorefrontSocialLinks } from '@jersey-commerce/types';
import { useState } from 'react';
import { whatsappHref } from '../../lib/contact';

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
  whatsapp: MessageCircle,
};

const POLICY_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Returns & refunds' },
  { href: '/shipping-policy', label: 'Shipping' },
  { href: '/grievance', label: 'Grievance officer' },
] as const;

const SHOP_LINKS = [
  { href: '/products', label: 'All products' },
  { href: '/custom-orders', label: 'Customize' },
  { href: '/wholesale', label: 'Wholesale' },
  { href: '/quality-check', label: 'Quality Check' },
  { href: '/size-chart', label: 'Size Chart' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/account', label: 'Account' },
  { href: '/cart', label: 'Cart' },
] as const;

const FOOTER_CTAS = [
  { href: '/products', label: 'Shop jerseys', primary: true },
  { href: '/custom-orders', label: 'Customize', primary: false },
  { href: '/wholesale', label: 'Wholesale', primary: false },
] as const;

function socialEntries(links: StorefrontSocialLinks): Array<[string, string]> {
  return Object.entries(links).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-foreground/10">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between py-4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:text-accent"
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
  const collections = store.navigation.filter((item) => !item.parentId).slice(0, 6);
  const brand = store.tenant.name?.trim() || 'Jerzyfy';
  const intro =
    footer.body.trim() ||
    `${brand} is a football jersey store — club kits, national colours, and custom prints built to last beyond a season.`;
  const about =
    footer.aboutBody.trim() ||
    `Welcome to ${brand}. We focus on football jerseys only: replica-inspired club and national kits, and blank customs ready for name and number.`;
  const copyright = footer.copyright.trim() || `© ${year} ${brand}. All rights reserved.`;
  const contactEmail = store.website.contactEmail?.trim() || store.tenant.contactEmail?.trim() || null;
  const contactPhone = store.website.contactPhone?.trim() || store.tenant.contactPhone?.trim() || null;
  const contactAddress = store.website.contactAddress?.trim() || store.tenant.address?.trim() || null;
  const whatsapp = whatsappHref(store.website.socialLinks.whatsapp);
  const social = socialEntries(store.website.socialLinks).filter(([name]) => name.toLowerCase() !== 'whatsapp');
  const hasContact = Boolean(contactEmail || contactPhone || contactAddress || whatsapp || social.length > 0);

  return (
    <footer className="relative mt-10 overflow-hidden border-t border-foreground/10 bg-background text-foreground md:mt-16">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[60rem] max-w-[160vw] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--jerzyfy-accent) / 0.45), transparent)' }}
      />

      <div className="relative mx-auto max-w-store store-gutter pt-14 md:pt-24">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
          <span aria-hidden className="h-px w-8 bg-accent" />
          {brand}
        </p>
        <h2 className="mt-5 max-w-5xl break-words font-heading text-[clamp(2.25rem,9vw,5.5rem)] uppercase leading-[0.9] tracking-tight">
          The game never stops.{' '}
          <span className="text-accent">Neither should your style.</span>
        </h2>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">{intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {FOOTER_CTAS.map((cta) => (
            <Link
              key={cta.href}
              href={cta.href}
              className={cta.primary ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              {cta.label}
              {cta.primary ? <ArrowUpRight className="h-4 w-4" aria-hidden /> : null}
            </Link>
          ))}
        </div>

        <div className="mt-14 grid gap-10 border-t border-foreground/10 pt-10 md:mt-20 md:grid-cols-2">
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
                      <Link href={`/category/${item.slug}`} className="text-foreground underline-offset-4 hover:underline">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/custom-orders" className="text-foreground underline-offset-4 hover:underline">
                      Custom jerseys
                    </Link>
                  </li>
                </ul>
              </Accordion>
            ) : null}
            <div className="border-t border-foreground/10" />
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{footer.shopTitle}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {SHOP_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{footer.contactTitle}</p>
              {hasContact ? (
                <>
                  <ul className="mt-4 space-y-2.5 text-sm">
                    {contactEmail ? (
                      <li>
                        <a href={`mailto:${contactEmail}`} className="break-all text-muted-foreground transition-colors hover:text-foreground">
                          {contactEmail}
                        </a>
                      </li>
                    ) : null}
                    {contactPhone ? (
                      <li>
                        <a href={`tel:${contactPhone}`} className="text-muted-foreground transition-colors hover:text-foreground">
                          {contactPhone}
                        </a>
                      </li>
                    ) : null}
                    {whatsapp ? (
                      <li>
                        <a href={whatsapp} rel="noreferrer" target="_blank" className="text-muted-foreground transition-colors hover:text-foreground">
                          WhatsApp
                        </a>
                      </li>
                    ) : null}
                    {contactAddress ? (
                      <li className="max-w-[18rem] text-muted-foreground">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                          Address
                        </span>
                        <span className="mt-1 block whitespace-pre-line leading-relaxed">{contactAddress}</span>
                      </li>
                    ) : null}
                    <li>
                      <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
                        Contact page
                      </Link>
                    </li>
                  </ul>
                  {social.length > 0 || whatsapp ? (
                    <ul className="mt-5 flex flex-wrap items-center gap-3">
                      {whatsapp ? (
                        <li>
                          <a
                            href={whatsapp}
                            rel="noreferrer"
                            target="_blank"
                            aria-label="WhatsApp"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </li>
                      ) : null}
                      {social.map(([name, href]) => {
                        const Icon = SOCIAL_ICONS[name.toLowerCase()];
                        return (
                          <li key={name}>
                            <a
                              href={href}
                              rel="noreferrer"
                              target="_blank"
                              aria-label={name}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                            >
                              {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs uppercase">{name.slice(0, 2)}</span>}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </>
              ) : (
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
                      Contact us
                    </Link>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <p
        aria-hidden
        className="pointer-events-none relative mt-12 select-none whitespace-nowrap text-center font-heading text-[22vw] uppercase leading-[0.8] tracking-tight text-transparent md:mt-16"
        style={{ WebkitTextStroke: '1px hsl(var(--foreground) / 0.14)' }}
      >
        {brand}
      </p>

      <div className="relative border-t border-foreground/10">
        <div className="mx-auto flex max-w-store flex-col items-center gap-4 store-gutter py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:flex-row md:justify-between">
          <nav aria-label="Policies">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
