import localFont from 'next/font/local';

const interSrc = [
  { path: '../fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
  { path: '../fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
  { path: '../fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
  { path: '../fonts/inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
] as const;

export const inter = localFont({
  src: [...interSrc],
  variable: '--font-body-face',
  display: 'swap',
});

/** Same Inter files under the heading CSS variable for a single normal sans stack. */
export const headingFace = localFont({
  src: [...interSrc],
  variable: '--font-heading-face',
  display: 'swap',
});
