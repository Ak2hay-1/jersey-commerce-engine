import type { Metadata } from 'next';
import { ForgotPasswordForm } from '../../../components/account/password-reset-forms';
import { pageShare } from '../../../lib/page-meta';

export const metadata: Metadata = pageShare({
  title: 'Forgot password',
  description: 'Reset your Jerzyfy account password.',
  path: '/auth/forgot-password',
  noIndex: true,
});

export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center px-4 py-12 sm:py-16">
      <div className="w-full">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
