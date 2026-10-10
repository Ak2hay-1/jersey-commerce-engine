import Link from 'next/link';

export function ConsentNotice({ action }: { action: string }): React.JSX.Element {
  return (
    <p className="text-center text-xs leading-relaxed text-muted-foreground">
      By {action}, you agree to our{' '}
      <Link href="/terms" className="text-foreground underline underline-offset-4">
        Terms
      </Link>{' '}
      and{' '}
      <Link href="/privacy" className="text-foreground underline underline-offset-4">
        Privacy policy
      </Link>
      .
    </p>
  );
}
