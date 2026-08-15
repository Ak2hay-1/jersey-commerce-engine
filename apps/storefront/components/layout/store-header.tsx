'use client';

import Link from 'next/link';
import { Menu, ShoppingBag, User, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@jersey-commerce/ui';
import { useStore } from '../providers/store-provider';
import { useCart } from '../providers/cart-provider';
import { useAuth } from '../providers/auth-provider';
import { SearchBar } from './search-bar';
import { MobileMenu } from './mobile-menu';
import { ProductImage } from '../catalog/product-image';

export function StoreHeader(): React.JSX.Element {
  const store = useStore();
  const { cart, setOpen } = useCart();
  const { customer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-store items-center gap-4 px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
        <Link href="/" className="flex min-w-0 items-center gap-2">
          {store.theme.logo ? (
            <ProductImage src={store.theme.logo} alt="" className="h-8 w-8 object-contain" />
          ) : null}
          <span className="truncate font-heading text-xl uppercase tracking-[0.14em]">{store.tenant.name}</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex" aria-label="Primary">
          {store.navigation.slice(0, 6).map((item) => (
            <Link key={item.id} href={`/category/${item.slug}`} className="uppercase tracking-wide hover:text-accent">
              {item.name}
            </Link>
          ))}
          <Link href="/custom-orders" className="uppercase tracking-wide hover:text-accent">
            Custom
          </Link>
          <Link href="/products" className="uppercase tracking-wide hover:text-accent">
            Shop
          </Link>
        </nav>
        <div className="ml-auto hidden w-full max-w-sm md:block">
          <SearchBar />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button asChild variant="ghost" size="icon" aria-label={customer ? 'Account' : 'Sign in'}>
            <Link href={customer ? '/account' : '/auth/login'}>
              <User />
            </Link>
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Open cart" onClick={() => setOpen(true)}>
            <span className="relative">
              <ShoppingBag />
              {count > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {count}
                </span>
              ) : null}
            </span>
          </Button>
        </div>
      </div>
      {menuOpen ? <MobileMenu navigation={store.navigation} onClose={() => setMenuOpen(false)} /> : null}
    </header>
  );
}
