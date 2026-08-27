'use client';

import { RequireCustomer } from '../../../components/account/require-customer';
import { ProfileForm } from '../../../components/account/profile-form';

export function CompleteProfilePageClient(): React.JSX.Element {
  return (
    <RequireCustomer>
      <div className="px-4 py-12 sm:py-16">
        <ProfileForm mode="complete" />
      </div>
    </RequireCustomer>
  );
}
