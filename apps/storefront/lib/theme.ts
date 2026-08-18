export function hexToHslChannels(hex: string): string | null {
  const normalized = hex.trim().replace('#', '');
  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return `${h} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%`;
}

export function relativeLuminance(hex: string): number {
  const normalized = hex.trim().replace('#', '');
  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return 0;
  }
  const channel = (slice: string) => {
    const value = parseInt(slice, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(normalized.slice(0, 2));
  const g = channel(normalized.slice(2, 4));
  const b = channel(normalized.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastForeground(hex: string): string {
  return relativeLuminance(hex) > 0.45 ? '0 0% 10%' : '0 0% 98%';
}

export function themeStyleVars(theme: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  headingFont: string;
  bodyFont: string;
}): Record<string, string> {
  const primary = hexToHslChannels(theme.primaryColor) ?? '0 0% 7%';
  const secondary = hexToHslChannels(theme.secondaryColor) ?? '20 6% 42%';
  const accent = hexToHslChannels(theme.accentColor) ?? '0 60% 30%';
  const background = hexToHslChannels(theme.backgroundColor) ?? '36 20% 94%';
  const foreground = hexToHslChannels(theme.foregroundColor) ?? '0 0% 7%';
  return {
    '--primary': primary,
    '--primary-foreground': contrastForeground(theme.primaryColor),
    '--secondary': '36 14% 90%',
    '--secondary-foreground': secondary,
    '--accent': accent,
    '--accent-foreground': contrastForeground(theme.accentColor),
    '--background': background,
    '--foreground': foreground,
    '--card': background,
    '--card-foreground': foreground,
    '--muted': '36 12% 90%',
    '--muted-foreground': '20 6% 38%',
    '--ring': primary,
    '--border': '30 8% 82%',
    '--input': '30 8% 82%',
    '--radius': '0.15rem',
    '--glass': '36 20% 96% / 0.72',
    '--glass-border': '0 0% 100% / 0.35',
    '--font-heading': `var(--font-heading-face), "${theme.headingFont}", "Instrument Serif", serif`,
    '--font-body': `var(--font-body-face), "${theme.bodyFont}", Inter, sans-serif`,
  };
}
