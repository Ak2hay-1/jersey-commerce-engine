'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search } from 'lucide-react';
import type { StorefrontSearchSuggestion } from '@jersey-commerce/types';
import { storeApi } from '../../lib/api';
import { Input } from '../ui/input';
import { MOTION_TRANSITION } from '../motion/presence';

export function SearchBar({ onNavigate }: { onNavigate?: () => void }): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StorefrontSearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const showList = open && query.trim().length >= 2 && searched;

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setSearched(false);
      return;
    }
    const handle = window.setTimeout(() => {
      void storeApi.search({ search: query.trim(), pageSize: 6 }).then((result) => {
        setSuggestions(result.suggestions);
        setSearched(true);
        setOpen(true);
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = query.trim();
    if (!next) {
      return;
    }
    setOpen(false);
    onNavigate?.();
    router.push(`/products?search=${encodeURIComponent(next)}`);
  }

  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={submit} role="search">
        <label htmlFor="store-search" className="sr-only">
          Search products
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="store-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => (suggestions.length > 0 || searched) && setOpen(true)}
          placeholder="Search tees, kits, brands"
          className="h-10 pl-9"
          autoComplete="off"
        />
      </form>
      <AnimatePresence>
        {showList ? (
          <motion.ul
            key="search-suggestions"
            className="absolute z-50 mt-1 w-full origin-top border border-border bg-background shadow-card"
            role="listbox"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={MOTION_TRANSITION}
          >
            {suggestions.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">No products found. Try another search.</li>
            ) : (
              suggestions.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="block px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                  >
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.type}</span>
                    <span className="ml-2">{item.name}</span>
                  </Link>
                </li>
              ))
            )}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
