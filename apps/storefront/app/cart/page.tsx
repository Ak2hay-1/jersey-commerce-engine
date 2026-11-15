import type { Metadata } from 'next';
import { CartPageView } from '../../components/cart/cart-page-view';
import { pageShare } from '../../lib/page-meta';

export const metadata: Metadata = pageShare({
  title: 'Cart',
  description: 'Review the football jerseys in your Jerzyfy cart before checkout.',
  path: '/cart',
});

export default function CartPage(): React.JSX.Element {
  return <CartPageView />;
}
