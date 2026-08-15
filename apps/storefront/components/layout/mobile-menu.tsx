'use client';

import Link from 'next/link';
import { SearchBar } from './search-bar';
import type { CategorySummary } from '@jersey-commerce/types';

export function MobileMenu({
  navigation,
  onClose,
}: {
  navigation: CategorySummary[];
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div className="border-t border-border bg-background px-4 py-4 md:hidden">
      <SearchBar onNavigate={onClose} />
      <nav className="mt-4 grid gap-2" aria-label="Mobile">
        {navigation.map((item) => (
          <Link key={item.id} href={`/category/${item.slug}`} className="py-2 font-heading text-lg uppercase" onClick={onClose}>
            {item.name}
          </Link>
        ))}
        <Link href="/custom-orders" className="py-2 font-heading text-lg uppercase" onClick={onClose}>
          Custom jerseys
        </Link>
        <Link href="/products" className="py-2 font-heading text-lg uppercase" onClick={onClose}>
          All products
        </Link>
      </nav>
    </div>
  );
}
