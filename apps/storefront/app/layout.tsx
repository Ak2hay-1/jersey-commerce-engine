import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { Instrument_Serif, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { storeApi } from '../lib/api';
import { serverStoreOptions } from '../lib/server-options';
import { fallbackStore } from '../lib/fallback-store';
import { themeStyleVars } from '../lib/theme';
import { loadStoreChrome } from '../lib/store-chrome';
import { DEFAULT_STORE_CHROME } from '../lib/swatch';
import { StoreProvider } from '../components/providers/store-provider';
import { CartProvider } from '../components/providers/cart-provider';
import { AuthProvider } from '../components/providers/auth-provider';
import { StoreHeader } from '../components/layout/store-header';
import { StoreFooter } from '../components/layout/store-footer';
import { AnnouncementBar } from '../components/layout/announcement-bar';
import { BrandPreloader } from '../components/layout/brand-preloader';
import { CartDrawer } from '../components/cart/cart-drawer';
import { TenantSwitcher } from '../components/layout/tenant-switcher';
import { JsonLd, organizationJsonLd } from '../components/seo/json-ld';
import { SmoothScroll } from '../components/motion/smooth-scroll';
import { CustomCursor } from '../components/motion/custom-cursor';
import { FilmGrain } from '../components/motion/film-grain';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body-face',
});

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-heading-face',
});

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const store = await storeApi.bootstrap(await serverStoreOptions());
    return {
      title: {
        default: store.website.seoTitle || store.tenant.name,
        template: `%s · ${store.tenant.name}`,
      },
      description: store.website.seoDescription || `${store.tenant.name} storefront`,
      icons: store.theme.favicon ? [{ rel: 'icon', url: store.theme.favicon }] : undefined,
    };
  } catch {
    return {
      title: 'Store',
      description: 'Premium streetwear and match kits.',
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): Promise<React.JSX.Element> {
  const headerStore = await headers();
  const host = headerStore.get('host');
  const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host ?? 'localhost:3000'}`;
  let store = fallbackStore;
  let chrome = DEFAULT_STORE_CHROME;
  let unavailable = false;
  try {
    const options = await serverStoreOptions();
    store = await storeApi.bootstrap(options);
    chrome = await loadStoreChrome(options);
  } catch {
    unavailable = true;
  }
  const theme = themeStyleVars(store.theme);

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${instrument.variable} min-h-screen bg-background antialiased`}
        style={theme as CSSProperties}
      >
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <StoreProvider value={store} chrome={chrome}>
          <SmoothScroll>
            <AuthProvider>
              <CartProvider>
                <CustomCursor />
                <FilmGrain />
                <BrandPreloader />
                <AnnouncementBar />
                <StoreHeader />
                <CartDrawer />
                <main id="main">{unavailable ? <p className="px-4 py-16 text-center text-sm text-muted-foreground">The store is temporarily unavailable. Please try again shortly.</p> : children}</main>
                <StoreFooter />
                <TenantSwitcher />
              </CartProvider>
            </AuthProvider>
          </SmoothScroll>
        </StoreProvider>
        <JsonLd data={organizationJsonLd(store, origin)} />
      </body>
    </html>
  );
}
