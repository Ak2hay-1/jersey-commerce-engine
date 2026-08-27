import type { Metadata } from 'next';
import { CompleteProfilePageClient } from './complete-profile-client';

export const metadata: Metadata = { title: 'Complete profile' };

export default function CompleteProfilePage(): React.JSX.Element {
  return <CompleteProfilePageClient />;
}
