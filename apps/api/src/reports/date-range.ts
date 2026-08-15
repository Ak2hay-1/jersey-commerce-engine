import { BadRequestException } from '@nestjs/common';
import { DATE_RANGE_PRESETS, type DateRangePreset } from '@jersey-commerce/types';

export interface ResolvedDateRange {
  preset: DateRangePreset;
  from: Date;
  to: Date;
  timeZone: string;
}

function partNumber(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value ?? '0');
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  let hour = partNumber(parts, 'hour');
  if (hour === 24) {
    hour = 0;
  }
  const asUtc = Date.UTC(
    partNumber(parts, 'year'),
    partNumber(parts, 'month') - 1,
    partNumber(parts, 'day'),
    hour,
    partNumber(parts, 'minute'),
    partNumber(parts, 'second'),
  );
  return asUtc - date.getTime();
}

export function zonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const offset = timeZoneOffsetMs(new Date(guess), timeZone);
  const instant = new Date(guess - offset);
  const adjust = timeZoneOffsetMs(instant, timeZone) - offset;
  return adjust === 0 ? instant : new Date(instant.getTime() - adjust);
}

export function ymdInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return {
    year: partNumber(parts, 'year'),
    month: partNumber(parts, 'month'),
    day: partNumber(parts, 'day'),
  };
}

function startOfDay(year: number, month: number, day: number, timeZone: string): Date {
  return zonedDateTime(year, month, day, 0, 0, 0, 0, timeZone);
}

function endOfDay(year: number, month: number, day: number, timeZone: string): Date {
  const next = addDays(year, month, day, 1);
  return new Date(startOfDay(next.year, next.month, next.day, timeZone).getTime() - 1);
}

function addDays(year: number, month: number, day: number, delta: number): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function parseIsoDate(value: string, label: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${label} must be a valid ISO date.`);
  }
  return parsed;
}

export function resolveDateRange(input: {
  preset?: string;
  from?: string;
  to?: string;
  timeZone: string;
  now?: Date;
}): ResolvedDateRange {
  const timeZone = input.timeZone || 'Asia/Kolkata';
  const now = input.now ?? new Date();
  const preset = (input.preset ?? (input.from || input.to ? 'custom' : 'today')) as DateRangePreset;
  if (!DATE_RANGE_PRESETS.includes(preset)) {
    throw new BadRequestException('preset is not a supported date range.');
  }
  const today = ymdInTimeZone(now, timeZone);

  if (preset === 'custom') {
    if (!input.from || !input.to) {
      throw new BadRequestException('Custom ranges require from and to.');
    }
    const from = parseIsoDate(input.from, 'from');
    const to = parseIsoDate(input.to, 'to');
    if (to < from) {
      throw new BadRequestException('to must be on or after from.');
    }
    return { preset, from, to, timeZone };
  }

  if (preset === 'today') {
    return { preset, from: startOfDay(today.year, today.month, today.day, timeZone), to: endOfDay(today.year, today.month, today.day, timeZone), timeZone };
  }
  if (preset === 'yesterday') {
    const y = addDays(today.year, today.month, today.day, -1);
    return { preset, from: startOfDay(y.year, y.month, y.day, timeZone), to: endOfDay(y.year, y.month, y.day, timeZone), timeZone };
  }
  if (preset === 'last_7_days') {
    const start = addDays(today.year, today.month, today.day, -6);
    return {
      preset,
      from: startOfDay(start.year, start.month, start.day, timeZone),
      to: endOfDay(today.year, today.month, today.day, timeZone),
      timeZone,
    };
  }
  if (preset === 'last_30_days') {
    const start = addDays(today.year, today.month, today.day, -29);
    return {
      preset,
      from: startOfDay(start.year, start.month, start.day, timeZone),
      to: endOfDay(today.year, today.month, today.day, timeZone),
      timeZone,
    };
  }
  if (preset === 'this_month') {
    return {
      preset,
      from: startOfDay(today.year, today.month, 1, timeZone),
      to: endOfDay(today.year, today.month, today.day, timeZone),
      timeZone,
    };
  }
  const lastMonthDate = addDays(today.year, today.month, 1, -1);
  const lastMonthStart = { year: lastMonthDate.year, month: lastMonthDate.month, day: 1 };
  return {
    preset,
    from: startOfDay(lastMonthStart.year, lastMonthStart.month, lastMonthStart.day, timeZone),
    to: endOfDay(lastMonthDate.year, lastMonthDate.month, lastMonthDate.day, timeZone),
    timeZone,
  };
}

export function toReportRangeDto(range: ResolvedDateRange) {
  return {
    preset: range.preset,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    timeZone: range.timeZone,
  };
}
