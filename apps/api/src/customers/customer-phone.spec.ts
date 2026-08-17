import { looksLikePhoneSearch, normalizeEmail, normalizePhone } from './customer-phone';

describe('customer-phone', () => {
  it('normalizes Indian numbers with country code, spaces, and leading zero', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('919876543210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
    expect(normalizePhone('9876543210')).toBe('9876543210');
  });

  it('returns null for empty values', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
  });

  it('lowercases email', () => {
    expect(normalizeEmail('  Rahul@Example.INVALID ')).toBe('rahul@example.invalid');
    expect(normalizeEmail('')).toBeNull();
  });

  it('detects phone-like search input', () => {
    expect(looksLikePhoneSearch('9876543210')).toBe(true);
    expect(looksLikePhoneSearch('Rahul Patil')).toBe(false);
  });
});
