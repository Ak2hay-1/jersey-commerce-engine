import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS',
  description: 'Tenant-aware point of sale application for the Jersey Commerce Engine.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
