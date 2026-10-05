import Link from 'next/link';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
  as: Heading = 'h1',
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
  as?: 'h1' | 'h2';
}): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center md:py-24">
      {icon ? (
        <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[hsl(var(--surface-1))] text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <Heading className="font-display break-words text-[clamp(2rem,6vw,2.75rem)]">{title}</Heading>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-lg btn-primary mt-8 cursor-pointer">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
