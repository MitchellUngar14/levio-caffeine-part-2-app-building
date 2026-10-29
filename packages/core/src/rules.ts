import { clockOnDay, clockToMinutes, shiftDayKey, weekdayOfDayKey, zonedParts } from "./time";
import type { Intake, LastReminder, Settings } from "./types";

export type ReminderReason =
  | "outside-work-hours"
  | "past-cutoff"
  | "over-limit"
  | "not-due"
  | "already-reminded"
  | "due";

export interface ReminderDecision {
  remind: boolean;
  reason: ReminderReason;
  /** Which gap or set time this decision is about (present when a slot exists). */
  slot?: string;
}

export interface ReminderInput {
  now: Date;
  settings: Settings;
  /** Intakes for the current work day (extra entries from other days are ignored). */
  intakesToday: Intake[];
  lastReminder: LastReminder | null;
}

/** The work day `now` belongs to, with its start and end instants, or null when outside work. */
export function currentWorkDay(now: Date, settings: Settings): { dayKey: string; start: Date; end: Date } | null {
  const p = zonedParts(now, settings.timeZone);
  const startMin = clockToMinutes(settings.workStart);
  const endMin = clockToMinutes(settings.workEnd);
  const crossesMidnight = endMin <= startMin;

  const candidates = crossesMidnight ? [p.dayKey, shiftDayKey(p.dayKey, -1)] : [p.dayKey];
  for (const dayKey of candidates) {
    if (!settings.workDays.includes(weekdayOfDayKey(dayKey))) continue;
    const start = clockOnDay(dayKey, settings.workStart, settings.timeZone);
    const endDay = crossesMidnight ? shiftDayKey(dayKey, 1) : dayKey;
    const end = clockOnDay(endDay, settings.workEnd, settings.timeZone);
    if (now >= start && now < end) return { dayKey, start, end };
  }
  return null;
}

/** Sum of mg for intakes that fall on `dayKey` in the settings' time zone. */
export function totalForDay(intakes: Intake[], dayKey: string, timeZone: string): number {
  let total = 0;
  for (const i of intakes) {
    if (zonedParts(new Date(i.takenAt), timeZone).dayKey === dayKey) total += i.mg;
  }
  return total;
}

/** Totals per zone day, "YYYY-MM-DD" → mg. */
export function dailyTotals(intakes: Intake[], timeZone: string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const i of intakes) {
    const key = zonedParts(new Date(i.takenAt), timeZone).dayKey;
    totals.set(key, (totals.get(key) ?? 0) + i.mg);
  }
  return totals;
}

function latestIntakeAt(intakes: Intake[], notBefore: Date, notAfter: Date): Date | null {
  let latest: Date | null = null;
  for (const i of intakes) {
    const t = new Date(i.takenAt);
    if (t < notBefore || t > notAfter) continue;
    if (!latest || t > latest) latest = t;
  }
  return latest;
}

/**
 * Pure decision: should a reminder fire right now?
 * Checks run in order and the first match wins:
 * outside work hours → past cut-off → at the limit → not due → already reminded → due.
 */
export function shouldRemind({ now, settings, intakesToday, lastReminder }: ReminderInput): ReminderDecision {
  const work = currentWorkDay(now, settings);
  if (!work) return { remind: false, reason: "outside-work-hours" };

  const nowMin = zonedParts(now, settings.timeZone).minutesOfDay;
  if (nowMin >= clockToMinutes(settings.cutoffTime)) return { remind: false, reason: "past-cutoff" };

  const total = intakesToday.filter((i) => new Date(i.takenAt) >= work.start && new Date(i.takenAt) <= now).reduce((s, i) => s + i.mg, 0)
    + totalOutsideWork(intakesToday, work.dayKey, work.start, settings.timeZone);
  if (total >= settings.dailyLimitMg) return { remind: false, reason: "over-limit" };

  const lastIntake = latestIntakeAt(intakesToday, work.start, now);
  const lastReminderAt = lastReminder && new Date(lastReminder.at) >= work.start ? new Date(lastReminder.at) : null;

  if (settings.reminder.mode === "gap") {
    const gapMs = settings.reminder.gapMinutes * 60_000;
    let reference = work.start;
    if (lastIntake && lastIntake > reference) reference = lastIntake;
    if (lastReminderAt && lastReminderAt > reference) reference = lastReminderAt;
    const slot = `${work.dayKey}:gap:${reference.toISOString()}`;
    if (now.getTime() - reference.getTime() < gapMs) return { remind: false, reason: "not-due", slot };
    if (lastReminder?.slot === slot) return { remind: false, reason: "already-reminded", slot };
    return { remind: true, reason: "due", slot };
  }

  // Set times: the latest set time that has passed today, within work hours.
  const times = [...settings.reminder.times].sort();
  let due: { time: string; at: Date; previous: Date } | null = null;
  let previous = work.start;
  for (const time of times) {
    const at = clockOnDay(work.dayKey, time, settings.timeZone);
    if (at < work.start || at >= work.end) continue;
    if (at > now) break;
    due = { time, at, previous };
    previous = at;
  }
  if (!due) return { remind: false, reason: "not-due" };
  const slot = `${work.dayKey}:time:${due.time}`;
  if (lastIntake && lastIntake >= due.previous) return { remind: false, reason: "not-due", slot };
  if (lastReminder?.slot === slot) return { remind: false, reason: "already-reminded", slot };
  return { remind: true, reason: "due", slot };
}

/** Caffeine logged on the work day but before work started (an early coffee still counts). */
function totalOutsideWork(intakes: Intake[], dayKey: string, workStart: Date, timeZone: string): number {
  let total = 0;
  for (const i of intakes) {
    const t = new Date(i.takenAt);
    if (t < workStart && zonedParts(t, timeZone).dayKey === dayKey) total += i.mg;
  }
  return total;
}

/** When the next reminder could fire, given no further intake, or null if none today. */
export function nextReminderAt({ now, settings, intakesToday, lastReminder }: ReminderInput): Date | null {
  const work = currentWorkDay(now, settings);
  if (!work) return null;
  const cutoff = clockOnDay(work.dayKey, settings.cutoffTime, settings.timeZone);
  const deadline = cutoff < work.end ? cutoff : work.end;
  if (totalForDay(intakesToday, work.dayKey, settings.timeZone) >= settings.dailyLimitMg) return null;

  let candidate: Date | null = null;
  if (settings.reminder.mode === "gap") {
    const lastIntake = latestIntakeAt(intakesToday, work.start, now);
    const lastReminderAt = lastReminder && new Date(lastReminder.at) >= work.start ? new Date(lastReminder.at) : null;
    let reference = work.start;
    if (lastIntake && lastIntake > reference) reference = lastIntake;
    if (lastReminderAt && lastReminderAt > reference) reference = lastReminderAt;
    candidate = new Date(reference.getTime() + settings.reminder.gapMinutes * 60_000);
    if (candidate < now) candidate = now;
  } else {
    for (const time of [...settings.reminder.times].sort()) {
      const at = clockOnDay(work.dayKey, time, settings.timeZone);
      if (at < work.start || at >= work.end) continue;
      if (at > now) {
        candidate = at;
        break;
      }
    }
  }
  if (!candidate || candidate >= deadline) return null;
  return candidate;
}
