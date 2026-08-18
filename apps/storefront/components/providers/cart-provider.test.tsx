import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CartProvider, useCart } from './cart-provider';
import type { CartDto } from '@jersey-commerce/types';

const getCart = vi.fn();
const createCart = vi.fn();
const addCartItem = vi.fn();
const updateCartItem = vi.fn();
const removeCartItem = vi.fn();

vi.mock('../../lib/api', () => ({
  storeApi: {
    getCart: (...args: unknown[]) => getCart(...args),
    createCart: (...args: unknown[]) => createCart(...args),
    addCartItem: (...args: unknown[]) => addCartItem(...args),
    updateCartItem: (...args: unknown[]) => updateCartItem(...args),
    removeCartItem: (...args: unknown[]) => removeCartItem(...args),
  },
}));

function emptyCart(): CartDto {
  return {
    id: 'cart-1',
    status: 'ACTIVE',
    itemCount: 0,
    items: [],
    totals: {
      subtotal: '0.00',
      discount: '0.00',
      tax: '0.00',
      shippingAmount: '0.00',
      total: '0.00',
      currency: 'INR',
    },
    expiresAt: '2026-08-16T00:00:00.000Z',
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    cartToken: 'token',
  };
}

function Probe(): React.JSX.Element {
  const { cart, addItem, updateItem, removeItem } = useCart();
  return (
    <div>
      <p>count:{cart?.itemCount ?? 0}</p>
      <button type="button" onClick={() => void addItem('var-1', 1)}>
        add
      </button>
      <button type="button" onClick={() => void updateItem('line-1', 3)}>
        update
      </button>
      <button type="button" onClick={() => void removeItem('line-1')}>
        remove
      </button>
    </div>
  );
}

describe('cart provider', () => {
  beforeEach(() => {
    getCart.mockReset();
    createCart.mockReset();
    addCartItem.mockReset();
    updateCartItem.mockReset();
    removeCartItem.mockReset();
    getCart.mockResolvedValue(emptyCart());
  });

  it('loads an empty cart, then add/update/remove through the API', { timeout: 15000 }, async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(
      <CartProvider>
        <Probe />
      </CartProvider>,
    );
    await waitFor(() => expect(screen.getByText('count:0')).toBeInTheDocument());

    addCartItem.mockResolvedValue({ ...emptyCart(), itemCount: 1 });
    await user.click(screen.getByRole('button', { name: 'add' }));
    await waitFor(() => expect(addCartItem).toHaveBeenCalledWith({ productVariantId: 'var-1', quantity: 1 }));
    expect(screen.getByText('count:1')).toBeInTheDocument();

    updateCartItem.mockResolvedValue({ ...emptyCart(), itemCount: 1 });
    await user.click(screen.getByRole('button', { name: 'update' }));
    await waitFor(() => expect(updateCartItem).toHaveBeenCalledWith('line-1', 3));

    removeCartItem.mockResolvedValue(emptyCart());
    await user.click(screen.getByRole('button', { name: 'remove' }));
    await waitFor(() => expect(removeCartItem).toHaveBeenCalledWith('line-1'));
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });
});
