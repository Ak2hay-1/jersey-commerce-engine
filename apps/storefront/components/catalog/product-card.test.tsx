import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProductCard } from './product-card';
import type { StorefrontProductListItem, StorefrontVariant } from '@jersey-commerce/types';

const addItem = vi.fn();
const productApi = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('../providers/cart-provider', () => ({
  useCart: () => ({ addItem }),
}));

vi.mock('../../lib/api', () => ({
  storeApi: {
    product: (...args: unknown[]) => productApi(...args),
  },
}));

const product: StorefrontProductListItem = {
  id: 'p1',
  name: 'Home Kit',
  slug: 'home-kit',
  brand: 'Demo Athletic',
  status: 'ACTIVE',
  featured: true,
  category: null,
  primaryImage: { id: 'img', url: 'https://placehold.co/800x1000', altText: 'Home Kit front', sortOrder: 0, isPrimary: true },
  lowestPrice: '2499.00',
  highestPrice: '2499.00',
  compareAtPrice: null,
  variantCount: 2,
  availability: 'IN_STOCK',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const variants: StorefrontVariant[] = [
  {
    id: 'red-m',
    sku: 'KIT-RED-M',
    size: 'M',
    colour: 'Red',
    sellingPrice: '2499.00',
    compareAtPrice: null,
    availability: 'OUT_OF_STOCK',
    remaining: null,
  },
  {
    id: 'blue-m',
    sku: 'KIT-BLUE-M',
    size: 'M',
    colour: 'Blue',
    sellingPrice: '2499.00',
    compareAtPrice: null,
    availability: 'IN_STOCK',
    remaining: null,
  },
  {
    id: 'blue-l',
    sku: 'KIT-BLUE-L',
    size: 'L',
    colour: 'Blue',
    sellingPrice: '2499.00',
    compareAtPrice: null,
    availability: 'IN_STOCK',
    remaining: null,
  },
];

describe('ProductCard size picker', () => {
  beforeEach(() => {
    addItem.mockReset();
    productApi.mockReset();
    productApi.mockResolvedValue({ variants });
    addItem.mockResolvedValue(undefined);
  });

  it('enables a size when a later colour still has stock and adds that variant', async () => {
    const user = userEvent.setup();
    render(<ProductCard product={product} currency="INR" />);

    await user.click(screen.getByRole('button', { name: 'Add to cart' }));

    const sizeM = await screen.findByRole('button', { name: 'M' });
    expect(sizeM).not.toBeDisabled();

    await user.click(sizeM);
    expect(addItem).toHaveBeenCalledWith('blue-m', 1);
  });
});
