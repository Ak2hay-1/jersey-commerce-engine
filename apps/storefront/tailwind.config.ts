import type { Config } from 'tailwindcss';
import uiPreset from '../../packages/ui/tailwind-preset';

const config: Config = {
  presets: [uiPreset],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Barlow Condensed', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)',
        drawer: '0 16px 40px rgba(15, 23, 42, 0.18)',
      },
      maxWidth: {
        store: '80rem',
      },
    },
  },
};

export default config;
