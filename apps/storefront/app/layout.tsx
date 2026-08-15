import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { Barlow_Condensed, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { storeApi } from '../lib/api';
import { serverStoreOptions } from '../lib/server-options';
import { fallbackStore } from '../lib/fallback-store';
import { themeStyleVars } from '../lib/theme';
import { StoreProvider } from '../components/providers/store-provider';
import { CartProvider } from '../components/providers/cart-provider';
import { AuthProvider } from '../components/providers/auth-provider';
import { StoreHeader } from '../components/layout/store-header';
import { StoreFooter } from '../components/layout/store-footer';
import { CartDrawer } from '../components/cart/cart-drawer';
import { TenantSwitcher } from '../components/layout/tenant-switcher';
import { JsonLd, organizationJsonLd } from '../components/seo/json-ld';

const inter = Inter({ subsets: ['latin'], variable: '--font-body-face' });
const heading = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-heading-face' });

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
      description: 'Premium sportswear storefront.',
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
  let unavailable = false;
  try {
    store = await storeApi.bootstrap(await serverStoreOptions());
  } catch {
    unavailable = true;
  }
  const theme = themeStyleVars(store.theme);

  return (
    <html lang="en">
      <body className={`${inter.variable} ${heading.variable} min-h-screen bg-background antialiased`} style={theme as CSSProperties}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <StoreProvider value={store}>
          <AuthProvider>
            <CartProvider>
              <StoreHeader />
              <CartDrawer />
              <main id="main">{unavailable ? <p className="px-4 py-16 text-center text-sm text-muted-foreground">The store is temporarily unavailable. Please try again shortly.</p> : children}</main>
              <StoreFooter />
              <TenantSwitcher />
            </CartProvider>
          </AuthProvider>
        </StoreProvider>
        <JsonLd data={organizationJsonLd(store, origin)} />
      </body>
    </html>
  );
}
