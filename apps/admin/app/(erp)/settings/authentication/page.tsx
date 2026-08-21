import { AuthenticationSettingsForm } from '../../../settings/authentication/authentication-settings-form';
import { PageHeader } from '@/components/page-header';

export default function AuthenticationSettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Authentication"
        description="Choose how customers sign in on the storefront. Staff Admin and POS login stay email and password."
      />
      <AuthenticationSettingsForm />
    </div>
  );
}
