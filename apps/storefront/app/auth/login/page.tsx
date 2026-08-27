import type { Metadata } from 'next';
import { LoginForm } from '../../../components/account/auth-forms';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center px-4 py-12 sm:py-16">
      <div className="w-full">
        <LoginForm />
      </div>
    </div>
  );
}
