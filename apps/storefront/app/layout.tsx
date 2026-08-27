import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { headers } from 'next/headers';
import './globals.css';
import { instrument, inter } from '../lib/fonts';
import { serverTenantOptions } from '../lib/server-options';
import { cachedBootstrap, tenantKey } from '../lib/cached-store';
import { fallbackStore } from '../lib/fallback-store';
import { themeStyleVars } from '../lib/theme';
import { loadStoreChrome } from '../lib/store-chrome';
import { DEFAULT_STORE_CHROME } from '../lib/swatch';
import { StoreProvider, CustomizerBridge } from '../components/providers/store-provider';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const options = await serverTenantOptions();
    const store = await cachedBootstrap(tenantKey(options));
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
      description: 'Football jerseys for club, national, kids, and custom kits.',
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
    const options = await serverTenantOptions();
    const slug = tenantKey(options);
    // Parallel: bootstrap is shared with generateMetadata / page via React.cache.
    const [boot, nextChrome] = await Promise.all([cachedBootstrap(slug), loadStoreChrome(options)]);
    store = boot;
    chrome = nextChrome;
  } catch {
    unavailable = true;
  }
  const theme = themeStyleVars(store.theme);

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${instrument.variable} min-h-dvh overflow-x-clip bg-background antialiased`}
        style={theme as CSSProperties}
      >
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <StoreProvider value={store} chrome={chrome}>
          <CustomizerBridge />
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
