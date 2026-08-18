import localFont from 'next/font/local';

export const inter = localFont({
  src: [
    { path: '../fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
});
