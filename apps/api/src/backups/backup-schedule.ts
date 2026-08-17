import type { BackupIntervalUnit } from '@jersey-commerce/types';

export const DEFAULT_SCHEDULE_TIME = '02:00';
export const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

export function parseScheduleTime(value: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    throw new Error('Schedule time must be HH:mm in 24-hour format.');
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function getZonedParts(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

function zonedLocalToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const guess = new Date(desired);
  const parts = getZonedParts(guess, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
  return new Date(desired - (asUtc - desired));
}

function addCalendarDays(parts: DateParts, days: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
  };
}

function addCalendarMonths(parts: DateParts, months: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + months, parts.day));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
  };
}

function addInterval(
  from: Date,
  intervalValue: number,
  intervalUnit: BackupIntervalUnit,
  timeZone: string,
  hour: number,
  minute: number,
): Date {
  const parts = getZonedParts(from, timeZone);
  if (intervalUnit === 'HOURS') {
    return new Date(from.getTime() + intervalValue * 60 * 60 * 1000);
  }
  const target =
    intervalUnit === 'DAYS'
      ? addCalendarDays(parts, intervalValue)
      : intervalUnit === 'WEEKS'
        ? addCalendarDays(parts, intervalValue * 7)
        : addCalendarMonths(parts, intervalValue);
  return zonedLocalToUtc(timeZone, target.year, target.month, target.day, hour, minute);
}

function nextHourlySlot(
  now: Date,
  hour: number,
  minute: number,
  intervalHours: number,
  timeZone: string,
): Date {
  if (intervalHours >= 24) {
    const parts = getZonedParts(now, timeZone);
    const today = zonedLocalToUtc(timeZone, parts.year, parts.month, parts.day, hour, minute);
    if (today.getTime() >= now.getTime()) {
      return today;
    }
    return addInterval(today, intervalHours, 'HOURS', timeZone, hour, minute);
  }

  const intervalMinutes = intervalHours * 60;
  const phase = ((hour * 60 + minute) % intervalMinutes + intervalMinutes) % intervalMinutes;
  const parts = getZonedParts(now, timeZone);

  for (let dayOffset = 0; dayOffset <= 2; dayOffset += 1) {
    const day = addCalendarDays(parts, dayOffset);
    for (let slotMinutes = phase; slotMinutes < 24 * 60; slotMinutes += intervalMinutes) {
      const slotHour = Math.floor(slotMinutes / 60);
      const slotMinute = slotMinutes % 60;
      const candidate = zonedLocalToUtc(timeZone, day.year, day.month, day.day, slotHour, slotMinute);
      if (candidate.getTime() >= now.getTime()) {
        return candidate;
      }
    }
  }

  return new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
}

export function computeNextRunAt(options: {
  now: Date;
  lastRunAt: Date | null;
  scheduleTime: string;
  intervalValue: number;
  intervalUnit: BackupIntervalUnit;
  timeZone?: string;
}): Date {
  const timeZone = options.timeZone && options.timeZone.length > 0 ? options.timeZone : DEFAULT_TIME_ZONE;
  const { hour, minute } = parseScheduleTime(options.scheduleTime);

  if (options.lastRunAt) {
    let candidate = addInterval(
      options.lastRunAt,
      options.intervalValue,
      options.intervalUnit,
      timeZone,
      hour,
      minute,
    );
    let guard = 0;
    while (candidate.getTime() <= options.now.getTime() && guard < 10_000) {
      candidate = addInterval(candidate, options.intervalValue, options.intervalUnit, timeZone, hour, minute);
      guard += 1;
    }
    return candidate;
  }

  if (options.intervalUnit === 'HOURS') {
    return nextHourlySlot(options.now, hour, minute, options.intervalValue, timeZone);
  }

  const nowParts = getZonedParts(options.now, timeZone);
  const todayAt = zonedLocalToUtc(timeZone, nowParts.year, nowParts.month, nowParts.day, hour, minute);
  if (todayAt.getTime() >= options.now.getTime()) {
    return todayAt;
  }
  return addInterval(todayAt, options.intervalValue, options.intervalUnit, timeZone, hour, minute);
}
