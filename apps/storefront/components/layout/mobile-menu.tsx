'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SearchBar } from './search-bar';
import type { CategorySummary } from '@jersey-commerce/types';
import { MOTION_DURATION, MOTION_EASE, MOTION_TRANSITION } from '../motion/presence';

const PRIMARY = [
  { href: '/products', label: 'Shop', id: 'shop' },
  { href: '/products?sort=newest', label: 'Latest', id: 'latest' },
  { href: '/category/football', label: 'Jerseys', id: 'jerseys' },
  { href: '/about', label: 'About', id: 'about' },
  { href: '/custom-orders', label: 'Custom jerseys', id: 'custom' },
  { href: '/account', label: 'Account', id: 'account' },
];

export function MobileMenu({
  open,
  navigation,
  onClose,
}: {
  open: boolean;
  navigation: CategorySummary[];
  onClose: () => void;
}): React.JSX.Element {
  const reduced = useReducedMotion();
  const extras = navigation
    .filter((item) => !item.parentId)
    .map((item) => ({ href: `/category/${item.slug}`, label: item.name, id: item.id }));
  const seen = new Set(PRIMARY.map((item) => item.href));
  const links = [...PRIMARY, ...extras.filter((item) => !seen.has(item.href))];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mobile-menu"
          className="overflow-hidden border-t border-border bg-background md:hidden"
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={MOTION_TRANSITION}
        >
          <div className="px-4 py-4">
            <SearchBar onNavigate={onClose} />
            <motion.nav
              className="mt-4 grid gap-1"
              aria-label="Mobile"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: reduced ? 0 : 0.05,
                    delayChildren: reduced ? 0 : 0.08,
                  },
                },
              }}
            >
              {links.map((item) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 },
                    show: {
                      opacity: 1,
                      x: 0,
                      transition: { duration: MOTION_DURATION, ease: MOTION_EASE },
                    },
                  }}
                >
                  <Link href={item.href} className="block py-2 font-heading text-2xl uppercase" onClick={onClose}>
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
