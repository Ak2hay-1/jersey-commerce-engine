import type { Metadata } from 'next';
import { RegisterForm } from '../../../components/account/auth-forms';
import { pageShare } from '../../../lib/page-meta';

export const metadata: Metadata = pageShare({
  title: 'Create account',
  description: 'Create a Jerzyfy account to track orders and checkout faster.',
  path: '/auth/register',
  noIndex: true,
});

export default function RegisterPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center px-4 py-12 sm:py-16">
      <div className="w-full">
        <RegisterForm />
      </div>
    </div>
  );
}
