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
  const primary = hexToHslChannels(theme.primaryColor) ?? '222 47% 11%';
  const secondary = hexToHslChannels(theme.secondaryColor) ?? '220 9% 46%';
  const accent = hexToHslChannels(theme.accentColor) ?? '32 95% 44%';
  const background = hexToHslChannels(theme.backgroundColor) ?? '0 0% 100%';
  const foreground = hexToHslChannels(theme.foregroundColor) ?? '222 47% 11%';
  return {
    '--primary': primary,
    '--primary-foreground': contrastForeground(theme.primaryColor),
    '--secondary': '210 20% 96%',
    '--secondary-foreground': secondary,
    '--accent': accent,
    '--accent-foreground': contrastForeground(theme.accentColor),
    '--background': background,
    '--foreground': foreground,
    '--card': background,
    '--card-foreground': foreground,
    '--muted': '210 20% 96%',
    '--muted-foreground': '220 9% 40%',
    '--ring': primary,
    '--border': '214 20% 88%',
    '--input': '214 20% 88%',
    '--radius': '0.375rem',
    '--font-heading': `"${theme.headingFont}", Inter, sans-serif`,
    '--font-body': `"${theme.bodyFont}", Inter, sans-serif`,
  };
}
