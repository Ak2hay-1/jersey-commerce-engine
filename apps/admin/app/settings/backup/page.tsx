import { BackupSettingsForm } from './backup-settings-form';

export default function BackupSettingsPage(): React.JSX.Element {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-muted/40 p-6">
      <BackupSettingsForm />
    </main>
  );
}
