import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@jersey-commerce/ui';
import { storeApi } from '../../lib/api';
import { serverStoreOptions } from '../../lib/server-options';
import { CustomOrderEnquiryForm } from '../../components/custom-orders/enquiry-form';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const store = await storeApi.bootstrap(await serverStoreOptions());
    return {
      title: 'Wholesale Jerseys',
      description: `Wholesale football jerseys for retailers, academies, and resellers from ${store.tenant.name}.`,
    };
  } catch {
    return { title: 'Wholesale Jerseys' };
  }
}

const STEPS = [
  'Share the kits, sizes, and quantities you want to stock',
  'Receive a tiered wholesale quotation',
  'Confirm the order and pay a deposit',
  'We pack size-wise and dispatch to your shop',
];

const BENEFITS = [
  { title: 'Tiered pricing', body: 'Better per-piece rates as your quantity grows — quoted per order, not a fixed list price.' },
  { title: 'Size-ratio packs', body: 'Order by size split (S–XXL, kids) so your shelf matches what your customers actually buy.' },
  { title: 'Repeat restocks', body: 'Your enquiries, quotes, and balances stay on one account, so reordering a best-seller is quick.' },
];

export default async function WholesalePage(): Promise<React.JSX.Element> {
  const config = await storeApi.customOrderConfig(await serverStoreOptions());

  return (
    <div>
      <section className="relative overflow-hidden border-b border-foreground/10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, hsl(var(--jerzyfy-accent) / 0.5), transparent)' }}
        />
        <div className="relative mx-auto grid max-w-store gap-8 store-gutter py-12 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Trade &amp; resale</p>
            <h1 className="mt-3 break-words font-heading text-[clamp(2rem,9vw,4.5rem)] uppercase leading-[0.9] tracking-wide md:text-7xl">
              Wholesale Jerseys
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Stock club, national, and kids football jerseys for your store, academy, or event — bulk quantities at trade pricing.
            </p>
            <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
              <a href="#enquiry">Request a wholesale quote</a>
            </Button>
          </div>
          <ol className="grid content-center gap-4 text-sm">
            {STEPS.map((item, index) => (
              <li key={item} className="border border-foreground/15 px-4 py-3">
                <span className="font-heading text-xl text-accent">0{index + 1}</span>
                <p className="mt-1">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-store store-gutter py-12 md:py-14">
        <h2 className="font-heading text-3xl uppercase tracking-wide">Why buy wholesale</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {BENEFITS.map((item) => (
            <div key={item.title} className="border border-border p-5">
              <h3 className="font-heading text-xl uppercase tracking-wide">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="enquiry" className="mx-auto grid max-w-store gap-10 store-gutter py-12 md:grid-cols-[1fr_1.2fr] md:py-16">
        <div>
          <h2 className="font-heading text-3xl uppercase tracking-wide">Wholesale enquiry</h2>
          <p className="mt-3 text-muted-foreground">
            No account required. Tell us what you want to stock and we will reply with a quotation you can track online.
          </p>
          <p className="mt-6 text-sm">
            Need names, numbers, or your own crest?{' '}
            <Link href="/custom-orders" className="underline">
              Customize a team kit
            </Link>
            .
          </p>
        </div>
        <CustomOrderEnquiryForm config={config} defaultType="WHOLESALE_ORDER" lockType />
      </section>
    </div>
  );
}
