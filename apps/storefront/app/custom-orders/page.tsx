import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@jersey-commerce/ui';
import { storeApi } from '../../lib/api';
import { serverStoreOptions } from '../../lib/server-options';
import { formatMoney } from '../../lib/format';
import { CustomOrderEnquiryForm } from '../../components/custom-orders/enquiry-form';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const store = await storeApi.bootstrap(await serverStoreOptions());
    return {
      title: 'Create Your Team Jersey',
      description: `Custom, team, college, and bulk jerseys from ${store.tenant.name}.`,
    };
  } catch {
    return { title: 'Create Your Team Jersey' };
  }
}

export default async function CustomOrdersPage(): Promise<React.JSX.Element> {
  const options = await serverStoreOptions();
  const [store, config] = await Promise.all([storeApi.bootstrap(options), storeApi.customOrderConfig(options)]);
  const currency = config.tenant.currency || store.tenant.currency;

  return (
    <div>
      <section className="bg-foreground text-background">
        <div className="mx-auto grid max-w-store gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Teamwear studio</p>
            <h1 className="mt-3 font-heading text-5xl uppercase leading-[0.9] tracking-wide md:text-7xl">Create Your Team Jersey</h1>
            <p className="mt-4 max-w-md text-lg text-background/75">
              Custom kits for clubs, colleges, corporates, and tournaments — names, numbers, logos, and bulk sizes, quoted and produced to order.
            </p>
            <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
              <a href="#enquiry">Start an enquiry</a>
            </Button>
          </div>
          <ol className="grid content-center gap-4 text-sm">
            {[
              'Tell us the team, quantity, and colours',
              'Receive a versioned quotation',
              'Approve the design',
              'Pay a deposit and we start production',
            ].map((item, index) => (
              <li key={item} className="border border-background/15 px-4 py-3">
                <span className="font-heading text-xl text-accent">0{index + 1}</span>
                <p className="mt-1">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-store px-4 py-14">
        <h2 className="font-heading text-3xl uppercase tracking-wide">Why order here</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { title: 'Team builder', body: 'Player lists with name, size, and number — or size-wise bulk quantities.' },
            { title: 'Design approval', body: 'Every design version is kept. Nothing is treated as approved just because it was uploaded.' },
            { title: 'Deposits & tracking', body: 'Pay a deposit, keep a balance, and follow production without mixing it with regular checkout.' },
          ].map((item) => (
            <div key={item.title} className="border border-border p-5">
              <h3 className="font-heading text-xl uppercase tracking-wide">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted">
        <div className="mx-auto max-w-store px-4 py-14">
          <h2 className="font-heading text-3xl uppercase tracking-wide">Customization</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {config.customizationOptions.map((option) => (
              <div key={option.id} className="bg-background p-5">
                <h3 className="font-heading text-xl uppercase tracking-wide">{option.name}</h3>
                {option.description ? <p className="mt-2 text-sm text-muted-foreground">{option.description}</p> : null}
                <p className="mt-3 text-sm">
                  {option.pricingType === 'PERCENTAGE'
                    ? `${option.price}%`
                    : option.pricingType === 'PER_ITEM'
                      ? `${formatMoney(option.price, currency)} / item`
                      : formatMoney(option.price, currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="enquiry" className="mx-auto grid max-w-store gap-10 px-4 py-16 md:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="font-heading text-3xl uppercase tracking-wide">Bulk & team orders</h2>
          <p className="mt-3 text-muted-foreground">
            No account required to enquire. We will match or create your customer profile using the same CRM used for POS and website orders.
          </p>
          <p className="mt-6 text-sm">
            Prefer ready-made kits?{' '}
            <Link href="/products" className="underline">
              Shop the catalog
            </Link>
            .
          </p>
        </div>
        <CustomOrderEnquiryForm config={config} />
      </section>
    </div>
  );
}
