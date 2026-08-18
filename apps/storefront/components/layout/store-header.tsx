'use client';

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
  { href: '/category/football', label: 'Jerseys' },
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

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/85 backdrop-blur-xl transition-shadow duration-300',
        scrolled ? 'shadow-header' : 'shadow-none',
      )}
    >
      <div className="mx-auto grid h-16 max-w-store grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:grid-cols-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-none md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
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

        <Link href="/" className="justify-self-center">
          <span className="font-heading text-xl uppercase tracking-[0.2em] md:text-2xl">{store.tenant.name}</span>
        </Link>

        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-none"
            aria-label={searchOpen ? 'Close search' : 'Search'}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((value) => !value)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="rounded-none" aria-label={customer ? 'Account' : 'Sign in'}>
            <Link href={customer ? '/account' : '/auth/login'}>
              <User className="h-4 w-4" />
            </Link>
          </Button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
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
            className="mx-auto max-w-store border-t border-foreground/10 px-4 py-3"
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
