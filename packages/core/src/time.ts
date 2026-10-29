import type { ClockTime, Weekday } from "./types";

/** Wall-clock parts of an instant in a given IANA time zone. */
export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  hour: number;
  minute: number;
  weekday: Weekday;
  /** "YYYY-MM-DD" in the zone. */
  dayKey: string;
  /** Minutes since midnight in the zone. */
  minutesOfDay: number;
}

const WEEKDAYS: Record<string, Weekday> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const p: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(instant)) p[part.type] = part.value;
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  const hour = Number(p.hour) % 24;
  const minute = Number(p.minute);
  const weekday = WEEKDAYS[p.weekday ?? "Mon"] ?? 1;
  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday,
    dayKey: `${year}-${pad(month)}-${pad(day)}`,
    minutesOfDay: hour * 60 + minute,
  };
}

/** The instant at which a wall-clock time happens in a zone (handles DST shifts). */
export function zonedTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wanted;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    if (got === wanted) break;
    guess += wanted - got;
  }
  return new Date(guess);
}

/** The instant of a "HH:MM" clock time on the given zone day ("YYYY-MM-DD"). */
export function clockOnDay(dayKey: string, time: ClockTime, timeZone: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  const [h, min] = parseClock(time);
  return zonedTimeToInstant(y, m, d, h, min, timeZone);
}

export function parseClock(time: ClockTime): [number, number] {
  const [h, m] = time.split(":").map(Number);
  return [h ?? 0, m ?? 0];
}

export function clockToMinutes(time: ClockTime): number {
  const [h, m] = parseClock(time);
  return h * 60 + m;
}

/** Shift a "YYYY-MM-DD" key by whole days (calendar arithmetic, zone-independent). */
export function shiftDayKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekdayOfDayKey(dayKey: string): Weekday {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return (js === 0 ? 7 : js) as Weekday;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}
