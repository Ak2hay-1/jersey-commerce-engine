import type { Metadata } from 'next';
import Link from 'next/link';
import { DEFAULT_STOREFRONT_GUIDES } from '@jersey-commerce/types';
import { serverTenantOptions } from '../../lib/server-options';
import { cachedBootstrap, tenantKey } from '../../lib/cached-store';
import { Magnetic } from '../../components/motion/magnetic';
import { Reveal } from '../../components/motion/reveal';
import { SplitHeading } from '../../components/motion/split-heading';
import { pageShare } from '../../lib/page-meta';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return pageShare({
    title: 'Size Chart',
    description: 'Jerzyfy jersey size chart in centimetres — chest and length by size.',
    path: '/size-chart',
  });
}

export default async function SizeChartPage(): Promise<React.JSX.Element> {
  let intro = DEFAULT_STOREFRONT_GUIDES.sizeChartIntro;
  let rows = DEFAULT_STOREFRONT_GUIDES.sizeChartRows;
  let note = DEFAULT_STOREFRONT_GUIDES.sizeChartNote;
  try {
    const options = await serverTenantOptions();
    const store = await cachedBootstrap(tenantKey(options));
    const guides = store.website.chrome?.guides;
    if (guides) {
      intro = guides.sizeChartIntro || intro;
      rows = guides.sizeChartRows?.length ? guides.sizeChartRows : rows;
      note = guides.sizeChartNote || note;
    }
  } catch {
    // Defaults still render offline.
  }

  return (
    <div className="mx-auto max-w-3xl store-gutter py-12 md:py-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Guides</p>
      <SplitHeading
        as="h1"
        text="Size Chart"
        className="mt-4 break-words font-heading text-[clamp(2rem,10vw,4.5rem)] uppercase leading-[0.9] md:text-7xl"
      />
      <Reveal className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        <p>{intro}</p>
      </Reveal>

      <Reveal className="mt-10 overflow-x-auto border-t border-foreground/10 pt-8">
        <table className="w-full min-w-[18rem] border-collapse text-left text-sm md:text-base">
          <caption className="sr-only">Jersey size chart in centimetres</caption>
          <thead>
            <tr className="border-b border-foreground/15 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <th scope="col" className="py-3 pr-3 font-semibold">
                Size
              </th>
              <th scope="col" className="py-3 pr-3 font-semibold">
                Chest (cm)
              </th>
              <th scope="col" className="py-3 font-semibold">
                Length (cm)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.size} className="border-b border-foreground/10">
                <th scope="row" className="py-3 pr-3 font-heading text-lg font-semibold uppercase text-foreground">
                  {row.size}
                </th>
                <td className="tabular py-3 pr-3 text-muted-foreground">{row.chest}</td>
                <td className="tabular py-3 text-muted-foreground">{row.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {note ? <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{note}</p> : null}
      </Reveal>

      <div className="mt-12 flex flex-wrap gap-3">
        <Magnetic className="inline-block">
          <Link href="/quality-check" className="store-pill border border-foreground/20 px-8 py-3">
            Quality check
          </Link>
        </Magnetic>
        <Magnetic className="inline-block">
          <Link href="/products" className="store-pill bg-foreground px-8 py-3 text-background">
            Shop jerseys
          </Link>
        </Magnetic>
      </div>
    </div>
  );
}
