import type { Metadata } from 'next';
import { ProfileForm } from '../../../components/account/profile-form';

export const metadata: Metadata = { title: 'Profile' };

export default function ProfilePage(): React.JSX.Element {
  return <ProfileForm />;
}
