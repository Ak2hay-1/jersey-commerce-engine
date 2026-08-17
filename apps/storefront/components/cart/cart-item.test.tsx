import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CartItemRow } from './cart-item';
import type { CartItemDto } from '@jersey-commerce/types';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

function item(overrides: Partial<CartItemDto> = {}): CartItemDto {
  return {
    id: 'line-1',
    productVariantId: 'var-1',
    productName: 'Home Kit',
    productSlug: 'home-kit',
    sku: 'HK-M',
    size: 'M',
    color: 'Red',
    quantity: 2,
    unitPrice: '2499.00',
    currentUnitPrice: '2499.00',
    lineTotal: '4998.00',
    availableQuantity: 8,
    imageUrl: null,
    imageAlt: 'Home Kit',
    priceChanged: false,
    ...overrides,
  };
}

describe('CartItem', () => {
  it('updates quantity and can be removed', async () => {
    const user = userEvent.setup();
    const onQuantity = vi.fn();
    const onRemove = vi.fn();
    render(<CartItemRow item={item()} currency="INR" onQuantity={onQuantity} onRemove={onRemove} />);
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(onQuantity).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('surfaces price changes and unavailable stock from the backend', () => {
    render(
      <CartItemRow
        item={item({ priceChanged: true, currentUnitPrice: '2699.00', availableQuantity: 0 })}
        currency="INR"
        onQuantity={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText(/price updated/i)).toBeInTheDocument();
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
  });
});
