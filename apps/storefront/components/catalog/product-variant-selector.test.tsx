import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductVariantSelector } from './product-variant-selector';
import type { StorefrontVariant } from '@jersey-commerce/types';

const variants: StorefrontVariant[] = [
  {
    id: 's',
    sku: 'KIT-S',
    size: 'S',
    colour: 'Red',
    sellingPrice: '2499.00',
    compareAtPrice: '2999.00',
    availability: 'IN_STOCK',
    remaining: null,
  },
  {
    id: 'm',
    sku: 'KIT-M',
    size: 'M',
    colour: 'Red',
    sellingPrice: '2499.00',
    compareAtPrice: '2999.00',
    availability: 'LOW_STOCK',
    remaining: 2,
  },
  {
    id: 'l',
    sku: 'KIT-L',
    size: 'L',
    colour: 'Red',
    sellingPrice: '2499.00',
    compareAtPrice: null,
    availability: 'OUT_OF_STOCK',
    remaining: null,
  },
];

describe('ProductVariantSelector', () => {
  it('requires an in-stock size to be chosen', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ProductVariantSelector variants={variants} onSelect={onSelect} />);
    expect(screen.getByText(/select a size/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'M' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }));
    expect(screen.getByRole('button', { name: 'L' })).toBeDisabled();
  });
});
