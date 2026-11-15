import type { Metadata } from 'next';
import { LoginForm } from '../../../components/account/auth-forms';
import { pageShare } from '../../../lib/page-meta';

export const metadata: Metadata = pageShare({
  title: 'Sign in',
  description: 'Sign in to your Jerzyfy account.',
  path: '/auth/login',
  noIndex: true,
});

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center px-4 py-12 sm:py-16">
      <div className="w-full">
        <LoginForm />
      </div>
    </div>
  );
}
