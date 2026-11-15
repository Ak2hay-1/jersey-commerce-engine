import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '../../../components/account/password-reset-forms';
import { pageShare } from '../../../lib/page-meta';

export const metadata: Metadata = pageShare({
  title: 'Reset password',
  description: 'Choose a new password for your Jerzyfy account.',
  path: '/auth/reset-password',
  noIndex: true,
});

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center px-4 py-12 sm:py-16">
      <div className="w-full">
        <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
