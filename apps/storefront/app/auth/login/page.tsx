import type { Metadata } from 'next';
import { LoginForm } from '../../../components/account/auth-forms';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="px-4 py-16">
      <LoginForm />
    </div>
  );
}
