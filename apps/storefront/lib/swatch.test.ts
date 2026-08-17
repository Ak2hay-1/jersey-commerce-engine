import { describe, expect, it } from 'vitest';
import { colorToHex } from './swatch';

describe('colorToHex', () => {
  it('maps named catalogue colours to hex', () => {
    expect(colorToHex('Orange')).toBe('#ea580c');
    expect(colorToHex('navy')).toBe('#1e3a5f');
  });

  it('falls back to accent orange for unknown names', () => {
    expect(colorToHex('Unknown Finish')).toBe('#ea580c');
  });
});
