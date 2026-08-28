import { isStorefrontProfileComplete } from './store-profile.util';

describe('isStorefrontProfileComplete', () => {
  it('returns false when required fields are missing', () => {
    expect(
      isStorefrontProfileComplete({
        name: 'Alex',
        phone: null,
        address: null,
        city: null,
        state: null,
        postalCode: null,
      }),
    ).toBe(false);
  });

  it('returns true when name, phone, and address fields are set', () => {
    expect(
      isStorefrontProfileComplete({
        name: 'Alex',
        phone: '+919876543210',
        address: '12 MG Road',
        city: 'Bengaluru',
        state: 'KA',
        postalCode: '560001',
      }),
    ).toBe(true);
  });
});
