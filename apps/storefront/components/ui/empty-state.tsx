import { Button } from '@jersey-commerce/ui';
import Link from 'next/link';

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}): React.JSX.Element {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-heading text-3xl uppercase tracking-wide">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-6">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
