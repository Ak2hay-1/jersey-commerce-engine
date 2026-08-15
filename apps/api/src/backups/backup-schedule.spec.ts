import { computeNextRunAt } from './backup-schedule';

describe('computeNextRunAt', () => {
  const timeZone = 'Asia/Kolkata';

  it('schedules the next daily time today when it is still upcoming', () => {
    const now = new Date('2026-08-15T01:00:00+05:30');
    const next = computeNextRunAt({
      now,
      lastRunAt: null,
      scheduleTime: '02:00',
      intervalValue: 1,
      intervalUnit: 'DAYS',
      timeZone,
    });
    expect(next.toISOString()).toBe(new Date('2026-08-15T02:00:00+05:30').toISOString());
  });

  it('rolls a daily schedule to tomorrow after the time has passed', () => {
    const now = new Date('2026-08-15T10:00:00+05:30');
    const next = computeNextRunAt({
      now,
      lastRunAt: null,
      scheduleTime: '02:00',
      intervalValue: 1,
      intervalUnit: 'DAYS',
      timeZone,
    });
    expect(next.toISOString()).toBe(new Date('2026-08-16T02:00:00+05:30').toISOString());
  });

  it('picks the next 6-hour slot from the scheduled start time', () => {
    const now = new Date('2026-08-15T09:15:00+05:30');
    const next = computeNextRunAt({
      now,
      lastRunAt: null,
      scheduleTime: '02:00',
      intervalValue: 6,
      intervalUnit: 'HOURS',
      timeZone,
    });
    expect(next.toISOString()).toBe(new Date('2026-08-15T14:00:00+05:30').toISOString());
  });

  it('adds a weekly interval from the last successful run', () => {
    const lastRunAt = new Date('2026-08-08T02:00:00+05:30');
    const now = new Date('2026-08-15T03:00:00+05:30');
    const next = computeNextRunAt({
      now,
      lastRunAt,
      scheduleTime: '02:00',
      intervalValue: 1,
      intervalUnit: 'WEEKS',
      timeZone,
    });
    expect(next.toISOString()).toBe(new Date('2026-08-22T02:00:00+05:30').toISOString());
  });
});
