'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button, cn } from '@jersey-commerce/ui';
import { DEFAULT_STOREFRONT_CHROME } from '@jersey-commerce/types';
import { useStore } from '../providers/store-provider';
import { useCart } from '../providers/cart-provider';
import { useAuth } from '../providers/auth-provider';
import { SearchBar } from './search-bar';
import { MobileMenu } from './mobile-menu';
import { MOTION_TRANSITION } from '../motion/presence';
import { SlidingNumber } from '../motion/sliding-number';

const PILL_NAV = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/custom-orders', label: 'Customize' },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StoreHeader(): React.JSX.Element {
  const store = useStore();
  const pathname = usePathname();
  const { cart, setOpen } = useCart();
  const { customer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();
  const count = cart?.itemCount ?? 0;
  const isHome = pathname === '/';
  const homeOverStage = isHome && !scrolled;
  const brand = store.tenant.name?.trim() || 'Jerzyfy';
  const nav =
    store.website.chrome?.headerNav?.length
      ? store.website.chrome.headerNav
      : DEFAULT_STOREFRONT_CHROME.headerNav;

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
        'z-40 transition-[background-color,box-shadow,border-color,padding] duration-300',
        isHome
          ? 'fixed inset-x-0 top-0 pt-[env(safe-area-inset-top)]'
          : 'sticky top-0 pt-[env(safe-area-inset-top)]',
        isHome
          ? 'border-b border-transparent bg-transparent'
          : 'glass-nav-bar border-b border-white/10 shadow-header',
      )}
    >
      <div
        className={cn(
          'mx-auto grid h-14 max-w-store grid-cols-[1fr_auto_1fr] items-center gap-2 store-gutter sm:h-16 sm:gap-3',
          isHome && 'mt-2 sm:mt-3',
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-full lg:hidden',
              homeOverStage ? 'text-white hover:bg-white/10' : 'text-foreground',
            )}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2"
            aria-label={brand}
          >
            {store.theme.logo ? (
              <Image
                src={store.theme.logo}
                alt={brand}
                width={120}
                height={40}
                className="h-8 w-auto max-w-[40vw] object-contain sm:max-w-none"
                priority
              />
            ) : (
              <span
                className={cn(
                  'flex flex-col leading-none font-heading text-lg font-bold uppercase italic tracking-[0.12em]',
                  homeOverStage ? 'text-white' : 'text-foreground',
                )}
              >
                {brand}
              </span>
            )}
          </Link>
        </div>

        <nav
          className={cn(
            'glass-nav-pill hidden items-center gap-1 justify-self-center px-1.5 py-1.5 md:flex',
            isHome && scrolled && 'glass-nav-pill--elevated',
          )}
          aria-label="Primary"
        >
          {PILL_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors',
                  active
                    ? homeOverStage
                      ? 'bg-white text-black'
                      : 'bg-foreground text-background'
                    : homeOverStage
                      ? 'text-white/75 hover:bg-white/10 hover:text-white'
                      : 'text-foreground/75 hover:bg-foreground/10 hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            'flex items-center justify-end gap-0.5 sm:gap-1',
            homeOverStage && 'text-white',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-full md:h-9 md:w-9',
              homeOverStage && 'text-white hover:bg-white/10',
            )}
            aria-label={searchOpen ? 'Close search' : 'Search'}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((value) => !value)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className={cn(
              'hidden h-9 w-9 rounded-full sm:inline-flex',
              homeOverStage && 'text-white hover:bg-white/10',
            )}
            aria-label="Wishlist"
          >
            <Link href="/products">
              <Heart className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-full md:h-9 md:w-9',
              homeOverStage && 'text-white hover:bg-white/10',
            )}
            aria-label={customer ? 'Account' : 'Sign in'}
          >
            <Link href={customer ? '/account' : '/auth/login'}>
              <User className="h-4 w-4" />
            </Link>
          </Button>
          <button
            type="button"
            className={cn(
              'relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full md:h-9 md:w-9',
              homeOverStage && 'text-white hover:bg-white/10',
            )}
            aria-label="Open cart"
            onClick={() => setOpen(true)}
          >
            <ShoppingBag className="h-4 w-4" />
            <AnimatePresence>
              {count > 0 ? (
                <motion.span
                  key="cart-badge"
                  className={cn(
                    'absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center overflow-hidden rounded-full px-1 text-[10px] font-bold',
                    homeOverStage ? 'bg-white text-black' : 'bg-foreground text-background',
                  )}
                  initial={reduced ? { opacity: 0 } : { scale: 0.55, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { scale: 0.55, opacity: 0 }}
                  transition={MOTION_TRANSITION}
                >
                  <SlidingNumber value={count} />
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            key="header-search"
            className={cn(
              'mx-auto max-w-store border-t store-gutter py-3',
              isHome ? 'border-white/10 bg-black/40 backdrop-blur-md' : 'border-foreground/10',
            )}
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={MOTION_TRANSITION}
          >
            <SearchBar onNavigate={() => setSearchOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <MobileMenu open={menuOpen} navigation={store.navigation} headerNav={nav} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
