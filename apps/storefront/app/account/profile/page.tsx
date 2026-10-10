import type { Metadata } from 'next';
import { ProfileForm } from '../../../components/account/profile-form';
import { PrivacyControls } from '../../../components/account/privacy-controls';

export const metadata: Metadata = { title: 'Profile' };

export default function ProfilePage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <ProfileForm />
      <PrivacyControls />
    </div>
  );
}
