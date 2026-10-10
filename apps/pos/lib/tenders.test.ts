import { describe, expect, it } from 'vitest';
import { validateTenders, type TenderDraft } from './tenders';

function row(method: string, amount: string, extra: Partial<TenderDraft> = {}): TenderDraft {
  return { method, amount, amountReceived: '', reference: '', ...extra };
}

describe('validateTenders', () => {
  it('accepts a single cash tender with an empty amount (defaults to total)', () => {
    expect(validateTenders('1499.00', [row('CASH', '')])).toBeNull();
  });

  it('accepts a split that exactly covers the total', () => {
    expect(
      validateTenders('1000.00', [row('CASH', '400'), row('UPI', '600', { reference: 'UTR123' })]),
    ).toBeNull();
  });

  it('rejects a short split', () => {
    expect(validateTenders('1000.00', [row('CASH', '400'), row('UPI', '500', { reference: 'x' })])).toMatch(
      /short by/,
    );
  });

  it('rejects an overpaid split', () => {
    expect(validateTenders('1000.00', [row('CASH', '700'), row('UPI', '500', { reference: 'x' })])).toMatch(
      /exceed the total/,
    );
  });

  it('requires amounts on every split row', () => {
    expect(validateTenders('1000.00', [row('CASH', ''), row('UPI', '1000', { reference: 'x' })])).toMatch(
      /every split/,
    );
  });

  it('rejects zero, negative, and non-numeric amounts', () => {
    expect(validateTenders('10.00', [row('CASH', '0')])).toMatch(/greater than zero/);
    expect(validateTenders('10.00', [row('CASH', '-10')])).toMatch(/greater than zero/);
    expect(validateTenders('10.00', [row('CASH', 'abc')])).toMatch(/greater than zero/);
  });

  it('requires a reference for UPI and card', () => {
    expect(validateTenders('10.00', [row('UPI', '10')])).toMatch(/UPI requires/);
    expect(validateTenders('10.00', [row('CARD', '10')])).toMatch(/CARD requires/);
  });

  it('rejects cash received below the amount applied', () => {
    expect(validateTenders('500.00', [row('CASH', '500', { amountReceived: '200' })])).toMatch(/Cash received/);
  });

  it('handles paise rounding', () => {
    expect(validateTenders('0.30', [row('CASH', '0.1'), row('CASH', '0.2')])).toBeNull();
  });
});
