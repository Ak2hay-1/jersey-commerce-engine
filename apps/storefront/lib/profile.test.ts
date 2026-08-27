import { describe, expect, it } from 'vitest';
import { isProfileComplete } from './profile';

describe('isProfileComplete', () => {
  it('returns false when delivery fields are missing', () => {
    expect(
      isProfileComplete({
        phone: null,
        address: null,
        city: null,
        state: null,
        postalCode: null,
      }),
    ).toBe(false);
  });

  it('returns true when phone and address fields are set', () => {
    expect(
      isProfileComplete({
        phone: '+919876543210',
        address: '12 MG Road',
        city: 'Bengaluru',
        state: 'KA',
        postalCode: '560001',
      }),
    ).toBe(true);
  });
});
