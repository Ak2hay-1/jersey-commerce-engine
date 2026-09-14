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

const multiColour: StorefrontVariant[] = [
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
    id: 'red-l',
    sku: 'KIT-RED-L',
    size: 'L',
    colour: 'Red',
    sellingPrice: '2499.00',
    compareAtPrice: null,
    availability: 'OUT_OF_STOCK',
    remaining: null,
  },
  {
    id: 'blue-l',
    sku: 'KIT-BLUE-L',
    size: 'L',
    colour: 'Blue',
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

  it('keeps a size enabled when another colour still has stock', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ProductVariantSelector variants={multiColour} onSelect={onSelect} />);

    const sizeM = screen.getByRole('button', { name: 'M' });
    expect(sizeM).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'L' })).toBeDisabled();

    await user.click(sizeM);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'blue-m' }));
  });

  it('disables a size for the selected colour when that combo is out of stock', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(<ProductVariantSelector variants={multiColour} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Red' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'red-m' }));

    rerender(<ProductVariantSelector variants={multiColour} selectedId="red-m" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'M' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'L' })).toBeDisabled();
  });
});
