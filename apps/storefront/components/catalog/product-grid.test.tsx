import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductGrid } from './product-grid';
import type { StorefrontProductListItem } from '@jersey-commerce/types';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('../providers/cart-provider', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

const product: StorefrontProductListItem = {
  id: 'p1',
  name: 'Away Kit',
  slug: 'away-kit',
  brand: 'Demo Athletic',
  status: 'ACTIVE',
  featured: true,
  category: null,
  primaryImage: { id: 'img', url: 'https://placehold.co/800x1000', altText: 'Away Kit front', sortOrder: 0, isPrimary: true },
  lowestPrice: '1999.00',
  highestPrice: '1999.00',
  compareAtPrice: null,
  variantCount: 3,
  availability: 'IN_STOCK',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('product listing', () => {
  it('renders a product card with accessible image alt text', () => {
    const { container } = render(<ProductGrid products={[product]} currency="INR" />);
    expect(screen.getByRole('link', { name: 'Away Kit' })).toHaveAttribute('href', '/products/away-kit');
    expect(screen.getByAltText('Away Kit front')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
  });
});
