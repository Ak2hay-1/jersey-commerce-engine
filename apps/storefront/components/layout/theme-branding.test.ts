import { describe, expect, it } from 'vitest';
import { themeStyleVars } from '../../lib/theme';
import { applyJerzyfyDarkMatchday, JERZYFY_DARK_MATCHDAY } from '../../lib/jerzyfy-brand';

describe('tenant branding', () => {
  it('locks Jerzyfy dark match-day colors in single-tenant mode', () => {
    const vars = themeStyleVars({
      primaryColor: '#111111',
      secondaryColor: '#dd2222',
      accentColor: '#00ff00',
      backgroundColor: '#ffffff',
      foregroundColor: '#111111',
      headingFont: 'Instrument Serif',
      bodyFont: 'Inter',
    });
    const expectedBg = themeStyleVars({
      ...JERZYFY_DARK_MATCHDAY,
      headingFont: 'Instrument Serif',
      bodyFont: 'Inter',
    });
    expect(vars['--background']).toEqual(expectedBg['--background']);
    expect(vars['--accent']).toEqual(expectedBg['--accent']);
    expect(vars['--foreground']).toEqual(expectedBg['--foreground']);
  });

  it('preserves CMS colors when single-tenant merge is off', () => {
    const base = {
      primaryColor: '#1d4ed8',
      secondaryColor: '#64748b',
      accentColor: '#1d4ed8',
      backgroundColor: '#ffffff',
      foregroundColor: '#0f172a',
      headingFont: 'Barlow Condensed',
      bodyFont: 'Inter',
    };
    const merged = applyJerzyfyDarkMatchday(base, false);
    expect(merged.primaryColor).toBe('#1d4ed8');
    expect(merged.backgroundColor).toBe('#ffffff');
  });
});
