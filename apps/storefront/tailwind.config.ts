import type { Config } from 'tailwindcss';
import uiPreset from '../../packages/ui/tailwind-preset';

const config: Config = {
  presets: [uiPreset],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};

export default config;
