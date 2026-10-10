import Link from 'next/link';

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">This page does not exist in Jerzyfy Admin.</p>
        <Link href="/dashboard" className="text-sm font-medium text-primary underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
