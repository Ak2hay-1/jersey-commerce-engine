'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button, cn } from '@jersey-commerce/ui';
import { useStore } from '../providers/store-provider';
import { useCart } from '../providers/cart-provider';
import { useAuth } from '../providers/auth-provider';
import { SearchBar } from './search-bar';
import { MobileMenu } from './mobile-menu';
import { MOTION_TRANSITION } from '../motion/presence';

const NAV = [
  { href: '/products', label: 'Shop' },
  { href: '/products?sort=newest', label: 'Latest' },
  { href: '/category/football-jerseys', label: 'Jerseys' },
  { href: '/about', label: 'About' },
];

export function StoreHeader(): React.JSX.Element {
  const store = useStore();
  const { cart, setOpen } = useCart();
  const { customer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();
  const count = cart?.itemCount ?? 0;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    function closeDesktop() {
      if (media.matches) {
        setMenuOpen(false);
      }
    }
    closeDesktop();
    media.addEventListener('change', closeDesktop);
    return () => media.removeEventListener('change', closeDesktop);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-9 z-40 bg-background/85 backdrop-blur-xl transition-shadow duration-300',
        scrolled ? 'shadow-header' : 'shadow-none',
      )}
    >
      <div className="mx-auto grid h-14 max-w-store grid-cols-[1fr_auto_1fr] items-center gap-2 store-gutter sm:h-16 sm:gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-none lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
          <nav className="hidden min-w-0 items-center gap-5 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/80 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link href="/" className="min-w-0 justify-self-center px-1" aria-label={store.tenant.name}>
          {store.theme.logo ? (
            <Image
              src={store.theme.logo}
              alt={store.tenant.name}
              width={120}
              height={40}
              className="mx-auto h-8 w-auto max-w-[42vw] object-contain sm:h-9 sm:max-w-[46vw] md:h-10 lg:max-w-none"
              priority
            />
          ) : (
            <span className="block max-w-[42vw] truncate text-center font-heading text-lg uppercase tracking-[0.14em] sm:max-w-[46vw] sm:text-xl sm:tracking-[0.18em] md:text-2xl lg:max-w-none lg:tracking-[0.2em]">{store.tenant.name}</span>
          )}
        </Link>

        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-none md:h-9 md:w-9"
            aria-label={searchOpen ? 'Close search' : 'Search'}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((value) => !value)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-none md:h-9 md:w-9" aria-label={customer ? 'Account' : 'Sign in'}>
            <Link href={customer ? '/account' : '/auth/login'}>
              <User className="h-4 w-4" />
            </Link>
          </Button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] md:min-h-0"
            aria-label="Open cart"
            onClick={() => setOpen(true)}
          >
            <span className="hidden sm:inline">Cart{count > 0 ? ` (${count})` : ''}</span>
            <span className="relative">
              <ShoppingBag className="h-4 w-4" />
              <AnimatePresence>
                {count > 0 ? (
                  <motion.span
                    key={count}
                    className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center bg-foreground px-1 text-[10px] font-bold text-background"
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
            className="mx-auto max-w-store border-t border-foreground/10 store-gutter py-3"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={MOTION_TRANSITION}
          >
            <SearchBar onNavigate={() => setSearchOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <MobileMenu open={menuOpen} navigation={store.navigation} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
