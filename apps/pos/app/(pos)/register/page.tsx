'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PosCartDto, PosLookupItem, PosPaymentInput, PosSaleDto } from '@jersey-commerce/types';
import { CartPanel } from '@/components/cart-panel';
import { CustomerDialog } from '@/components/customer-dialog';
import { PaymentDialog } from '@/components/payment-dialog';
import { ProductSearch } from '@/components/product-search';
import { ReceiptDialog } from '@/components/receipt-dialog';
import { useAuth } from '@/lib/auth';
import {
  addCartItem,
  clearCart,
  completeSale,
  ensureCart,
  holdCart,
  updateCart,
  updateCartItem,
  removeCartItem,
} from '@/lib/pos-api';
import { usePosSession } from '@/lib/session';
import { useRealtimeReload } from '@/lib/realtime';

export default function RegisterPage(): React.JSX.Element {
  const auth = useAuth();
  const { refresh: refreshSession } = usePosSession();
  const [cart, setCart] = useState<PosCartDto | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [sale, setSale] = useState<PosSaleDto | null>(null);

  const loadCart = useCallback(async () => {
    const next = await ensureCart();
    setCart(next);
    return next;
  }, []);

  useEffect(() => {
    void loadCart().catch((err: Error) => setError(err.message));
  }, [loadCart]);

  useRealtimeReload(
    (event) => event.entity === 'PosCart' || event.entity === 'PosCartItem',
    () => {
      void loadCart().catch((err: Error) => setError(err.message));
    },
  );

  async function mutate(action: () => Promise<PosCartDto>): Promise<void> {
    setBusy(true);
    setError('');
    try {
      setCart(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cart update failed');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function addLookup(item: PosLookupItem): Promise<void> {
    await mutate(async () => {
      await ensureCart();
      return addCartItem({ productVariantId: item.variant.id, quantity: 1 });
    });
  }

  async function onComplete(payments: PosPaymentInput[]): Promise<void> {
    const completed = await completeSale({ cartId: cart?.id, payments });
    setSale(completed);
    setPayOpen(false);
    setReceiptOpen(true);
    await refreshSession();
    setCart(await ensureCart());
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_26rem] xl:grid-cols-[minmax(0,1.7fr)_30rem]">
      <div className="space-y-3">
        {error ? (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <ProductSearch onAdd={addLookup} busy={busy} />
      </div>
      <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
        <CartPanel
          cart={cart}
          canDiscount={auth.can('sales.discount')}
          busy={busy}
          onQuantity={(id, quantity) => mutate(() => updateCartItem(id, { quantity }))}
          onRemove={(id) => mutate(() => removeCartItem(id))}
          onLineDiscount={(id, discountType, discountValue) =>
            mutate(() => updateCartItem(id, { discountType, discountValue }))
          }
          onCartDiscount={(discountType, discountValue) => mutate(() => updateCart({ discountType, discountValue }))}
          onHold={async () => {
            if (!cart) {
              return;
            }
            await mutate(() => holdCart(cart.id));
            await loadCart();
          }}
          onClear={() => mutate(() => clearCart())}
          onCustomer={() => setCustomerOpen(true)}
          onPay={() => setPayOpen(true)}
        />
      </div>
      <CustomerDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        cart={cart}
        canCreate={auth.can('customers.create')}
        onWalkIn={() => mutate(() => updateCart({ walkIn: true }))}
        onAttach={(customerId) => mutate(() => updateCart({ customerId }))}
        onCreate={(newCustomer) => mutate(() => updateCart({ newCustomer }))}
      />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} cart={cart} onComplete={onComplete} />
      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        sale={sale}
        onNewSale={() => {
          setSale(null);
          void loadCart();
        }}
      />
    </div>
  );
}
