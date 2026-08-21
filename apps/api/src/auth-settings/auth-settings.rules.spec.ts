import { BadRequestException } from '@nestjs/common';
import { assertGoogleReady } from './auth-settings.rules';

describe('auth-settings rules', () => {
  it('rejects Google Sign-In without a client secret', () => {
    expect(() =>
      assertGoogleReady(true, { googleClientId: 'abc.apps.googleusercontent.com', googleClientSecret: undefined }, true),
    ).toThrow(BadRequestException);
  });

  it('allows Google Sign-In when id and secret are present', () => {
    expect(() =>
      assertGoogleReady(true, { googleClientId: 'abc.apps.googleusercontent.com', googleClientSecret: 'secret' }, true),
    ).not.toThrow();
  });
});
