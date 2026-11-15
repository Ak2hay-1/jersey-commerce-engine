import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { display, inter } from '../lib/fonts';
import { serverTenantOptions } from '../lib/server-options';
import { cachedBootstrap, tenantKey } from '../lib/cached-store';
import { fallbackStore } from '../lib/fallback-store';
import { themeStyleVars } from '../lib/theme';
import { loadStoreChrome } from '../lib/store-chrome';
import { DEFAULT_STORE_CHROME } from '../lib/swatch';
import { StoreProvider, CustomizerBridge } from '../components/providers/store-provider';
import { CartProvider } from '../components/providers/cart-provider';
import { AuthProvider } from '../components/providers/auth-provider';
import { WishlistProvider } from '../components/providers/wishlist-provider';
import { StoreHeader } from '../components/layout/store-header';
import { StoreFooter } from '../components/layout/store-footer';
import { BrandPreloader } from '../components/layout/brand-preloader';
import { CartDrawer } from '../components/cart/cart-drawer';
import { JsonLd, organizationJsonLd } from '../components/seo/json-ld';
import { SmoothScroll } from '../components/motion/smooth-scroll';
import { CustomCursor } from '../components/motion/custom-cursor';
import { FilmGrain } from '../components/motion/film-grain';
import { CookieNotice } from '../components/legal/cookie-notice';
import { MetaPixel } from '../components/analytics/meta-pixel';
import { STORE_COOKIES } from '../lib/cookies';
import { siteUrl } from '../lib/site-url';
import { HOME_TITLE } from '../lib/page-meta';

const FALLBACK_DESCRIPTION = 'Shop club, national, and custom football jerseys at Jerzyfy.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const options = await serverTenantOptions();
    const store = await cachedBootstrap(tenantKey(options));
    const seoTitle = store.website.seoTitle?.trim();
    const title = !seoTitle || seoTitle === store.tenant.name ? HOME_TITLE : seoTitle;
    const description = store.website.seoDescription || FALLBACK_DESCRIPTION;
    const image = store.theme.logo;
    return {
      metadataBase: new URL(siteUrl()),
      title: {
        default: title,
        template: `%s · ${store.tenant.name}`,
      },
      description,
      openGraph: {
        type: 'website',
        url: '/',
        title,
        description,
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : undefined,
      },
      icons: {
        icon: [
          { url: '/favicon.ico' },
          { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
      },
      manifest: '/manifest.webmanifest',
    };
  } catch {
    return {
      metadataBase: new URL(siteUrl()),
      title: HOME_TITLE,
      description: FALLBACK_DESCRIPTION,
      icons: {
        icon: [
          { url: '/favicon.ico' },
          { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
      },
      manifest: '/manifest.webmanifest',
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): Promise<React.JSX.Element> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(STORE_COOKIES.customer)?.value);
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
        className={`${inter.variable} ${display.variable} min-h-dvh overflow-x-clip bg-background antialiased`}
        style={theme as CSSProperties}
      >
        <MetaPixel />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <StoreProvider value={store} chrome={chrome}>
          <CustomizerBridge />
          <SmoothScroll>
              <AuthProvider hasSession={hasSession}>
                <WishlistProvider>
                <CartProvider>
                <CustomCursor />
                <FilmGrain />
                <BrandPreloader />
                <StoreHeader />
                <CartDrawer />
                <main id="main">{unavailable ? <p className="px-4 py-16 text-center text-sm text-muted-foreground">The store is temporarily unavailable. Please try again shortly.</p> : children}</main>
                <StoreFooter />
                <CookieNotice />
                </CartProvider>
                </WishlistProvider>
              </AuthProvider>
          </SmoothScroll>
        </StoreProvider>
        <JsonLd data={organizationJsonLd(store, origin)} />
      </body>
    </html>
  );
}
