import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { AuthProvider } from '@/lib/auth';
import { RealtimeProvider } from '@/lib/realtime';
import { inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS',
  description: 'Jerzyfy point of sale.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <AuthProvider>
          <RealtimeProvider>{children}</RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
