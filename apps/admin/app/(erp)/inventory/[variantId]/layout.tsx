import type { ReactNode } from 'react';

export function generateStaticParams(): Array<{ variantId: string }> {
  return [{ variantId: '__variantId__' }];
}

export default function DynamicIdLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return children as React.JSX.Element;
}
