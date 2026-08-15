import { BackupSettingsForm } from '../../../settings/backup/backup-settings-form';
import { PageHeader } from '@/components/page-header';

export default function BackupSettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <PageHeader title="Automatic backups" description="Folder backups on the API server. Destination paths are validated server-side." />
      <BackupSettingsForm />
    </div>
  );
}
