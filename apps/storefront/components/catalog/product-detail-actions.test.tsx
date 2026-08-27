import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductDetailActions } from './product-detail-actions';
import type { StorefrontProductDetail } from '@jersey-commerce/types';

const addItem = vi.fn();

vi.mock('../providers/cart-provider', () => ({
  useCart: () => ({ addItem }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const product: StorefrontProductDetail = {
  id: 'p1',
  name: 'Home Kit',
  slug: 'home-kit',
  description: 'Match jersey',
  shortDescription: 'Fan fit',
  brand: 'Demo Athletic',
  featured: true,
  seoTitle: null,
  seoDescription: null,
  category: null,
  images: [],
  variants: [
    {
      id: 's',
      sku: 'HK-S',
      size: 'S',
      colour: 'Red',
      sellingPrice: '2499.00',
      compareAtPrice: '2999.00',
      availability: 'IN_STOCK',
      remaining: null,
    },
    {
      id: 'm',
      sku: 'HK-M',
      size: 'M',
      colour: 'Red',
      sellingPrice: '2499.00',
      compareAtPrice: '2999.00',
      availability: 'LOW_STOCK',
      remaining: 2,
    },
  ],
  sizes: ['S', 'M'],
  colours: ['Red'],
  lowestPrice: '2499.00',
  highestPrice: '2499.00',
  compareAtPrice: '2999.00',
  related: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('product detail', () => {
  it('shows sale pricing before a variant is selected', () => {
    render(<ProductDetailActions product={product} currency="INR" />);
    expect(screen.getByText(/2,499/)).toBeInTheDocument();
    expect(screen.getByText(/2,999/)).toBeInTheDocument();
    expect(screen.getByText('Sale')).toBeInTheDocument();
  });

  it('requires a variant before adding to cart', async () => {
    const user = userEvent.setup();
    addItem.mockReset();
    render(<ProductDetailActions product={product} currency="INR" />);
    expect(screen.getByRole('button', { name: 'Select a variant' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'M' }));
    expect(screen.getByText(/only 2 left/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(addItem).toHaveBeenCalledWith('m', 1);
  });
});
