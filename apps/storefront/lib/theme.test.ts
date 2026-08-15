import { describe, expect, it } from 'vitest';
import { contrastForeground, hexToHslChannels } from './theme';

describe('theme tokens', () => {
  it('converts tenant hex colors into HSL channels', () => {
    expect(hexToHslChannels('#0f172a')).toMatch(/^\d+ .+% .+%$/);
    expect(hexToHslChannels('not-a-color')).toBeNull();
  });

  it('picks a readable foreground for dark and light brand colors', () => {
    expect(contrastForeground('#0f172a')).toBe('0 0% 98%');
    expect(contrastForeground('#f8fafc')).toBe('0 0% 10%');
  });
});
