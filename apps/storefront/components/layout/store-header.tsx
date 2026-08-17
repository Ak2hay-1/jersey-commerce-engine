'use client';

import Link from 'next/link';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button, cn } from '@jersey-commerce/ui';
import { useStore, useStoreChrome } from '../providers/store-provider';
import { useCart } from '../providers/cart-provider';
import { useAuth } from '../providers/auth-provider';
import { SearchBar } from './search-bar';
import { MobileMenu } from './mobile-menu';
import { ProductImage } from '../catalog/product-image';
import { MOTION_TRANSITION } from '../motion/presence';
import { colorToHex } from '../../lib/swatch';

export function StoreHeader(): React.JSX.Element {
  const store = useStore();
  const chrome = useStoreChrome();
  const { cart, setOpen } = useCart();
  const { customer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();
  const count = cart?.itemCount ?? 0;
  const sizes = chrome.sizes.length ? chrome.sizes : ['S', 'M', 'L'];
  const colours = chrome.colours.slice(0, 2);
  const featuredName = chrome.featuredName || store.tenant.name;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/70 backdrop-blur-xl transition-shadow duration-300',
        scrolled ? 'shadow-header' : 'shadow-none',
      )}
    >
      <div className="mx-auto flex h-14 max-w-store items-center gap-3 border-b border-foreground/10 px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-extrabold uppercase tracking-[0.22em]">{store.tenant.name}</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={searchOpen ? 'Close search' : 'Search'}
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen((value) => !value)}
        >
          <Search className="h-4 w-4" />
        </Button>

        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex" aria-label="Sizes">
          {sizes.map((size, index) => (
            <Link
              key={size}
              href={`/products?size=${encodeURIComponent(size)}`}
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', index === 0 ? 'bg-accent' : 'bg-foreground/25')} />
              {size}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label={customer ? 'Account' : 'Sign in'}>
            <Link href={customer ? '/account' : '/auth/login'}>
              <User className="h-4 w-4" />
            </Link>
          </Button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
            aria-label="Open cart"
            onClick={() => setOpen(true)}
          >
            <span>Cart{count > 0 ? ` (${count})` : ''}</span>
            <span className="relative">
              <ShoppingBag className="h-4 w-4" />
              <AnimatePresence>
                {count > 0 ? (
                  <motion.span
                    key={count}
                    className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
                    initial={reduced ? { opacity: 0 } : { scale: 0.55, opacity: 0 }}
                    animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { scale: 0.55, opacity: 0 }}
                    transition={MOTION_TRANSITION}
                  >
                    {count}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            key="header-search"
            className="mx-auto max-w-store px-4 py-3"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={MOTION_TRANSITION}
          >
            <SearchBar onNavigate={() => setSearchOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mx-auto flex max-w-store items-center gap-4 px-4 py-3">
        <Link href="/" className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-background">
          {store.theme.logo ? (
            <ProductImage src={store.theme.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-extrabold">{store.tenant.name.slice(0, 1)}</span>
          )}
        </Link>
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 sm:flex">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">Take plus + two colors</p>
          <div className="flex items-center gap-2">
            {colours.map((colour, index) => (
              <Link
                key={colour}
                href={`/products?colour=${encodeURIComponent(colour)}`}
                aria-label={`Shop ${colour}`}
                className={cn(
                  'h-6 w-6 rounded-full border border-black/10 shadow-sm',
                  index === 0 ? 'ring-2 ring-foreground/20' : '',
                )}
                style={
                  index === 0
                    ? { background: `conic-gradient(from 90deg, ${colorToHex(colour)} 0 50%, #fff 50%)` }
                    : { backgroundColor: colorToHex(colour) }
                }
              />
            ))}
          </div>
        </div>
        {chrome.featuredSlug ? (
          <Link
            href={`/products/${chrome.featuredSlug}`}
            className="ml-auto max-w-[10rem] text-right text-[11px] font-extrabold uppercase leading-tight tracking-[0.12em] sm:max-w-[14rem]"
          >
            {featuredName}
          </Link>
        ) : (
          <p className="ml-auto max-w-[10rem] text-right text-[11px] font-extrabold uppercase leading-tight tracking-[0.12em] sm:max-w-[14rem]">
            {featuredName}
          </p>
        )}
      </div>
      <MobileMenu open={menuOpen} navigation={store.navigation} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
