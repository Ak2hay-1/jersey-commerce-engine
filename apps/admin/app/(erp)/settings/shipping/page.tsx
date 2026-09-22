import { ShippingSettingsForm } from '../../../settings/shipping/shipping-settings-form';
import { PageHeader } from '@/components/page-header';

export default function ShippingSettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Shipping"
        description="Connect Delhivery for pincode checks, rate quotes, COD, labels, and tracking."
      />
      <ShippingSettingsForm />
    </div>
  );
}
