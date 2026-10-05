import localFont from 'next/font/local';

/** Inter for body copy and UI text. */
export const inter = localFont({
  src: [
    { path: '../fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body-face',
  display: 'swap',
});

/** Condensed athletic display face for headings, prices and labels. */
export const display = localFont({
  src: [
    { path: '../fonts/barlow-condensed-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/barlow-condensed-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/barlow-condensed-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-display-face',
  display: 'swap',
});
