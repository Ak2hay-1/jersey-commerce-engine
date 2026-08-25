import type { ReactNode } from 'react';

export function generateStaticParams(): Array<{ id: string }> {
  return [{ id: '__id__' }];
}

export default function DynamicIdLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return children as React.JSX.Element;
}
