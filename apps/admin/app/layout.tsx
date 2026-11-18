import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { AuthProvider } from '@/lib/auth';
import { RealtimeProvider } from '@/lib/realtime';
import { ThemeProvider } from '@/lib/theme';
import { getStaffPortal } from '@/lib/env';
import { inter } from '@/lib/fonts';
import './globals.css';

const portal = getStaffPortal();

export const metadata: Metadata = {
  title: portal === 'admin' ? 'Admin Panel' : portal === 'erp' ? 'ERP' : 'Admin & ERP',
  description: 'Jerzyfy staff console.',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <Script id="jerzyfy-theme-boot" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('jerzyfy-erp-theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`}
        </Script>
        <ThemeProvider>
          <AuthProvider>
            <RealtimeProvider>{children}</RealtimeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
