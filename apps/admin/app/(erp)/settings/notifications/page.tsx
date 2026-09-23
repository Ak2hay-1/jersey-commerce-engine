import { NotificationSettingsForm } from '../../../settings/notifications/notification-settings-form';
import { PageHeader } from '@/components/page-header';

export default function NotificationSettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Telegram staff alerts for orders, payments, and POS sales."
      />
      <NotificationSettingsForm />
    </div>
  );
}
