import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@jersey-commerce/ui';

export default function AdminForgotPasswordPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jerzyfy</p>
          <CardTitle className="mt-1">Forgot staff password</CardTitle>
          <CardDescription>
            Staff accounts cannot reset passwords from this page. Ask an owner or a superior admin to open Users, set a
            temporary password for your account, then sign in and change it when prompted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm font-medium underline underline-offset-4">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
