import type { Metadata } from 'next';
import { CheckoutForm } from '../../components/checkout/checkout-form';
import { pageShare } from '../../lib/page-meta';

export const metadata: Metadata = pageShare({
  title: 'Checkout',
  description: 'Enter delivery details and pay for your Jerzyfy order.',
  path: '/checkout',
});

export default function CheckoutPage(): React.JSX.Element {
  return <CheckoutForm />;
}
