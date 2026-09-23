import { describe, expect, it } from 'vitest';
import { firstInvalidEnquiryStep, validateEnquiryDraft, validateEnquiryStep } from './enquiry';

const base = {
  name: '',
  phone: '',
  email: '',
  teamName: '',
  quantity: '',
  type: 'TEAM_ORDER',
  preferredJerseyType: '',
  preferredColours: '',
  customizationRequirements: '',
  description: '',
  requiredDate: '',
  notes: '',
};

describe('validateEnquiryDraft', () => {
  it('requires a name and a phone or email', () => {
    expect(validateEnquiryDraft({ ...base })).toBe('Name is required.');

    expect(
      validateEnquiryDraft({
        ...base,
        name: 'Rahul Patil',
        teamName: 'Pune Warriors',
        quantity: '20',
      }),
    ).toBe('Provide a phone number or email.');
  });

  it('accepts a guest enquiry with optional fields omitted', () => {
    expect(
      validateEnquiryDraft({
        ...base,
        name: 'Rahul Patil',
        phone: '9876543210',
      }),
    ).toBeNull();
  });

  it('rejects an invalid quantity', () => {
    expect(
      validateEnquiryDraft({
        ...base,
        name: 'Rahul Patil',
        phone: '9876543210',
        quantity: '0',
      }),
    ).toBe('Quantity must be a positive whole number.');
  });
});

describe('validateEnquiryStep', () => {
  it('validates contact on step 0 and quantity on step 1', () => {
    expect(validateEnquiryStep(0, { ...base, name: 'A' })).toBe('Provide a phone number or email.');
    expect(validateEnquiryStep(1, { ...base, name: 'A', phone: '1', quantity: 'abc' })).toBe(
      'Quantity must be a positive whole number.',
    );
  });

  it('points submit to the first invalid step', () => {
    expect(firstInvalidEnquiryStep({ ...base })).toBe(0);
  });
});
