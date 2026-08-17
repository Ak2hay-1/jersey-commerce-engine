import { resolveDateRange } from './date-range';

describe('resolveDateRange', () => {
  const timeZone = 'Asia/Kolkata';
  const now = new Date('2026-08-15T08:30:00.000Z');

  it('defaults to today in the tenant timezone', () => {
    const range = resolveDateRange({ timeZone, now });
    expect(range.preset).toBe('today');
    expect(range.from.toISOString()).toBe('2026-08-14T18:30:00.000Z');
    expect(range.to.toISOString()).toBe('2026-08-15T18:29:59.999Z');
  });

  it('resolves yesterday, rolling windows, and months', () => {
    expect(resolveDateRange({ preset: 'yesterday', timeZone, now }).from.toISOString()).toBe(
      '2026-08-13T18:30:00.000Z',
    );
    const week = resolveDateRange({ preset: 'last_7_days', timeZone, now });
    expect(week.from.toISOString()).toBe('2026-08-08T18:30:00.000Z');
    const month = resolveDateRange({ preset: 'this_month', timeZone, now });
    expect(month.from.toISOString()).toBe('2026-07-31T18:30:00.000Z');
    const last = resolveDateRange({ preset: 'last_month', timeZone, now });
    expect(last.from.toISOString()).toBe('2026-06-30T18:30:00.000Z');
    expect(last.to.toISOString()).toBe('2026-07-31T18:29:59.999Z');
  });

  it('requires from/to for a custom range', () => {
    expect(() => resolveDateRange({ preset: 'custom', timeZone, now })).toThrow('Custom ranges require from and to.');
  });
});
