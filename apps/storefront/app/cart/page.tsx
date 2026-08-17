import type { Metadata } from 'next';
import { CartPageView } from '../../components/cart/cart-page-view';

export const metadata: Metadata = { title: 'Cart', alternates: { canonical: '/cart' } };

export default function CartPage(): React.JSX.Element {
  return <CartPageView />;
}
