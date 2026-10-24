import type { Metadata } from 'next';
import { CheckoutForm } from '../../components/checkout/checkout-form';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Enter delivery details and pay for your Jerzyfy order.',
  alternates: { canonical: '/checkout' },
};

export default function CheckoutPage(): React.JSX.Element {
  return <CheckoutForm />;
}
