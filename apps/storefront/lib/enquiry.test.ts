import { describe, expect, it } from 'vitest';
import { validateEnquiryDraft } from './enquiry';

describe('validateEnquiryDraft', () => {
  it('requires a name and a phone or email', () => {
    expect(validateEnquiryDraft({
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
    })).toBe('Name is required.');

    expect(validateEnquiryDraft({
      name: 'Rahul Patil',
      phone: '',
      email: '',
      teamName: 'Pune Warriors',
      quantity: '20',
      type: 'TEAM_ORDER',
      preferredJerseyType: '',
      preferredColours: '',
      customizationRequirements: '',
      description: '',
      requiredDate: '',
      notes: '',
    })).toBe('Provide a phone number or email.');
  });

  it('accepts a guest enquiry with optional fields omitted', () => {
    expect(validateEnquiryDraft({
      name: 'Rahul Patil',
      phone: '9876543210',
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
    })).toBeNull();
  });

  it('rejects an invalid quantity', () => {
    expect(validateEnquiryDraft({
      name: 'Rahul Patil',
      phone: '9876543210',
      email: '',
      teamName: '',
      quantity: '0',
      type: 'TEAM_ORDER',
      preferredJerseyType: '',
      preferredColours: '',
      customizationRequirements: '',
      description: '',
      requiredDate: '',
      notes: '',
    })).toBe('Quantity must be a positive whole number.');
  });
});
