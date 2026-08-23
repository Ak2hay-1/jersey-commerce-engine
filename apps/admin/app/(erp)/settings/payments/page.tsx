import { PaymentSettingsForm } from '../../../settings/payments/payment-settings-form';
import { PageHeader } from '@/components/page-header';

export default function PaymentSettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description="Connect Razorpay for secure online checkout on the storefront."
      />
      <PaymentSettingsForm />
    </div>
  );
}
