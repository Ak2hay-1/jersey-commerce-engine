import Link from 'next/link';
import type { ReactNode } from 'react';
import { serverStoreOptions } from '../../lib/server-options';
import { cachedBootstrap, tenantKey } from '../../lib/cached-store';
import { fallbackStore } from '../../lib/fallback-store';

// Policy copy is a template pending counsel review (DPDP Act 2023, IT Rules 2021,
// Consumer Protection (E-Commerce) Rules 2020). Bump this date whenever the text changes.
export const LEGAL_LAST_UPDATED = '10 October 2026';

export const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of service' },
  { href: '/refund-policy', label: 'Returns & refunds' },
  { href: '/shipping-policy', label: 'Shipping policy' },
  { href: '/grievance', label: 'Grievance officer' },
] as const;

export interface LegalContact {
  storeName: string;
  email: string | null;
  phone: string | null;
  grievanceOfficerName: string;
  grievanceEmail: string | null;
}

export async function loadLegalContact(): Promise<LegalContact> {
  let storeName = fallbackStore.tenant.name;
  let email: string | null = null;
  let phone: string | null = null;
  try {
    const store = await cachedBootstrap(tenantKey(await serverStoreOptions()));
    storeName = store.tenant.name;
    email = store.website.contactEmail || null;
    phone = store.website.contactPhone || null;
  } catch {
    // Policy pages must still render when the API is unreachable.
  }
  return {
    storeName,
    email,
    phone,
    grievanceOfficerName: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME?.trim() || 'Grievance Officer',
    grievanceEmail: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_EMAIL?.trim() || email,
  };
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl uppercase tracking-wide text-foreground md:text-2xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ContactLine({ contact }: { contact: LegalContact }): React.JSX.Element {
  return (
    <p>
      {contact.email ? (
        <>
          Email{' '}
          <a href={`mailto:${contact.email}`} className="text-foreground underline underline-offset-4">
            {contact.email}
          </a>
        </>
      ) : (
        'Use the contact details shown in the site footer'
      )}
      {contact.phone ? (
        <>
          {' '}
          or call{' '}
          <a href={`tel:${contact.phone}`} className="text-foreground underline underline-offset-4">
            {contact.phone}
          </a>
        </>
      ) : null}
      .
    </p>
  );
}

export function LegalPage({
  kicker = 'Legal',
  title,
  intro,
  children,
}: {
  kicker?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl store-gutter py-12 md:py-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{kicker}</p>
      <h1 className="mt-4 break-words font-heading text-[clamp(2rem,8vw,3.75rem)] uppercase leading-[0.95]">{title}</h1>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">Last updated {LEGAL_LAST_UPDATED}</p>
      {intro ? <div className="mt-8 text-base leading-relaxed text-muted-foreground">{intro}</div> : null}
      <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground md:text-base">{children}</div>
      <nav aria-label="Policies" className="mt-14 border-t border-foreground/10 pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.14em]">
          {LEGAL_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
