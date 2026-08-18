import { describe, expect, it } from 'vitest';
import { themeStyleVars } from '../../lib/theme';

describe('tenant branding', () => {
  it('applies tenant colors without hard-coded shop identity', () => {
    const dark = themeStyleVars({
      primaryColor: '#111111',
      secondaryColor: '#dd2222',
      accentColor: '#dd2222',
      backgroundColor: '#ffffff',
      foregroundColor: '#111111',
      headingFont: 'Barlow Condensed',
      bodyFont: 'Inter',
    });
    const light = themeStyleVars({
      primaryColor: '#1d4ed8',
      secondaryColor: '#ffffff',
      accentColor: '#1d4ed8',
      backgroundColor: '#ffffff',
      foregroundColor: '#0f172a',
      headingFont: 'Barlow Condensed',
      bodyFont: 'Inter',
    });
    expect(dark['--primary']).not.toEqual(light['--primary']);
    expect(dark['--accent']).not.toEqual(light['--accent']);
  });
});
