import type { Metadata } from 'next';
import { RegisterForm } from '../../../components/account/auth-forms';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage(): React.JSX.Element {
  return (
    <div className="px-4 py-12 sm:py-16">
      <RegisterForm />
    </div>
  );
}
