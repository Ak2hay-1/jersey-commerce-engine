import type { Config } from 'tailwindcss';
import uiPreset from '../../packages/ui/tailwind-preset';

const config: Config = {
  presets: [uiPreset],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)',
        luxury: '0 18px 50px rgba(15, 23, 42, 0.08)',
        drawer: '0 16px 40px rgba(15, 23, 42, 0.18)',
        header: '0 8px 24px rgba(15, 23, 42, 0.06)',
      },
      maxWidth: {
        store: '88rem',
      },
      animation: {
        'ken-burns': 'ken-burns 18s ease-out forwards',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        'ken-burns': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.08)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
};

export default config;
