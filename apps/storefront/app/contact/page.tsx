import type { Metadata } from 'next';
import Link from 'next/link';
import { Facebook, Instagram, MessageCircle, Twitter, Youtube } from 'lucide-react';
import { ContactForm } from '../../components/contact/contact-form';
import { loadLegalContact } from '../../components/legal/legal-page';
import { whatsappHref } from '../../lib/contact';
import { pageShare } from '../../lib/page-meta';
import { serverStoreOptions } from '../../lib/server-options';
import { cachedBootstrap, tenantKey } from '../../lib/cached-store';

export const metadata: Metadata = pageShare({
  title: 'Contact',
  description: 'Email, phone, WhatsApp, and social channels for Jerzyfy support and order help.',
  path: '/contact',
});

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
};

export default async function ContactPage(): Promise<React.JSX.Element> {
  const contact = await loadLegalContact();
  let socialEntries: Array<[string, string]> = [];
  try {
    const store = await cachedBootstrap(tenantKey(await serverStoreOptions()));
    socialEntries = Object.entries(store.website.socialLinks).filter(
      (entry): entry is [string, string] =>
        Boolean(entry[1]?.trim()) && entry[0].toLowerCase() !== 'whatsapp',
    );
  } catch {
    // Contact details from loadLegalContact still render.
  }
  const whatsapp = whatsappHref(contact.whatsapp);

  return (
    <div className="mx-auto max-w-3xl store-gutter py-12 md:py-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Contact</p>
      <h1 className="mt-4 break-words font-heading text-[clamp(2rem,8vw,3.75rem)] uppercase leading-[0.95]">
        Get in touch
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
        Questions about an order, a kit size, or a custom print? Reach {contact.storeName} through any channel below.
      </p>

      <dl className="mt-12 grid gap-6 sm:grid-cols-[10rem_1fr]">
        {contact.email ? (
          <>
            <dt className="font-semibold text-foreground">Email</dt>
            <dd>
              <a href={`mailto:${contact.email}`} className="text-foreground underline underline-offset-4">
                {contact.email}
              </a>
            </dd>
          </>
        ) : null}
        {contact.phone ? (
          <>
            <dt className="font-semibold text-foreground">Phone</dt>
            <dd>
              <a href={`tel:${contact.phone}`} className="text-foreground underline underline-offset-4">
                {contact.phone}
              </a>
            </dd>
          </>
        ) : null}
        {whatsapp ? (
          <>
            <dt className="font-semibold text-foreground">WhatsApp</dt>
            <dd>
              <a
                href={whatsapp}
                rel="noreferrer"
                target="_blank"
                className="inline-flex items-center gap-2 text-foreground underline underline-offset-4"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Chat on WhatsApp
              </a>
            </dd>
          </>
        ) : null}
        {contact.address ? (
          <>
            <dt className="font-semibold text-foreground">Address</dt>
            <dd className="whitespace-pre-line text-muted-foreground">{contact.address}</dd>
          </>
        ) : null}
      </dl>

      {!contact.email && !contact.phone && !whatsapp && !contact.address ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Contact details are being updated. Meanwhile, use the grievance officer channel for formal complaints.
        </p>
      ) : null}

      <div className="mt-12 border-t border-foreground/10 pt-10">
        <h2 className="font-heading text-xl uppercase tracking-wide">Send a message</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Tell us about an order, a size question, or a custom kit — we will reply by email.
        </p>
        <div className="mt-6 max-w-lg">
          <ContactForm />
        </div>
      </div>

      {socialEntries.length > 0 ? (
        <div className="mt-12">
          <h2 className="font-heading text-xl uppercase tracking-wide">Social</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {socialEntries.map(([name, href]) => {
              const Icon = SOCIAL_ICONS[name.toLowerCase()];
              return (
                <li key={name}>
                  <a
                    href={href}
                    rel="noreferrer"
                    target="_blank"
                    aria-label={name}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-foreground/15 px-4 text-sm text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    <span className="capitalize">{name}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p className="mt-12 text-sm text-muted-foreground">
        For order or privacy complaints, contact our{' '}
        <Link href="/grievance" className="text-foreground underline underline-offset-4">
          grievance officer
        </Link>
        {contact.grievanceOfficerName ? ` (${contact.grievanceOfficerName})` : null}
        {contact.grievanceEmail ? (
          <>
            {' '}
            at{' '}
            <a href={`mailto:${contact.grievanceEmail}`} className="text-foreground underline underline-offset-4">
              {contact.grievanceEmail}
            </a>
          </>
        ) : null}
        .
      </p>
    </div>
  );
}
