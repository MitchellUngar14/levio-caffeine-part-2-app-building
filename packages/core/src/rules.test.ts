import { clockOnDay } from "./time";
import { currentWorkDay, dailyTotals, nextReminderAt, shouldRemind } from "./rules";
import { DEFAULT_SETTINGS, type Intake, type Settings } from "./types";

const TZ = "America/Toronto";
const base: Settings = { ...DEFAULT_SETTINGS, timeZone: TZ };
// Thursday 2026-10-29 (EDT, UTC-4). Daylight saving ends Sunday 2026-11-01.
const at = (time: string, day = "2026-10-29") => clockOnDay(day, time, TZ);
const intake = (time: string, mg = 96, day = "2026-10-29"): Intake => ({
  id: time,
  name: "Coffee",
  mg,
  takenAt: at(time, day).toISOString(),
});

describe("currentWorkDay", () => {
  it("is null on a day off", () => {
    expect(currentWorkDay(at("10:00", "2026-10-31"), base)).toBeNull(); // Saturday
  });
  it("includes the start minute and excludes the end minute", () => {
    expect(currentWorkDay(at("09:00"), base)?.dayKey).toBe("2026-10-29");
    expect(currentWorkDay(at("17:00"), base)).toBeNull();
    expect(currentWorkDay(at("16:59"), base)?.dayKey).toBe("2026-10-29");
  });
  it("handles work hours that cross midnight", () => {
    const night = { ...base, workStart: "22:00", workEnd: "06:00", workDays: [4] as Settings["workDays"] }; // Thursday nights
    expect(currentWorkDay(at("23:00"), night)?.dayKey).toBe("2026-10-29");
    expect(currentWorkDay(at("02:00", "2026-10-30"), night)?.dayKey).toBe("2026-10-29"); // Friday 2am, Thursday's shift
    expect(currentWorkDay(at("02:00", "2026-10-29"), night)).toBeNull(); // Thursday 2am is Wednesday's shift, a day off
  });
});

describe("shouldRemind, gap mode", () => {
  it("skips outside work hours", () => {
    expect(shouldRemind({ now: at("08:59"), settings: base, intakesToday: [], lastReminder: null }).reason).toBe("outside-work-hours");
  });
  it("skips past the cut-off", () => {
    expect(shouldRemind({ now: at("15:00"), settings: base, intakesToday: [], lastReminder: null }).reason).toBe("past-cutoff");
  });
  it("skips at or over the daily limit, counting an early coffee", () => {
    const early = [intake("07:30", 300), intake("10:00", 100)];
    expect(shouldRemind({ now: at("14:00"), settings: base, intakesToday: early, lastReminder: null }).reason).toBe("over-limit");
  });
  it("measures the first reminder from the start of work", () => {
    expect(shouldRemind({ now: at("11:59"), settings: base, intakesToday: [], lastReminder: null }).reason).toBe("not-due");
    const d = shouldRemind({ now: at("12:00"), settings: base, intakesToday: [], lastReminder: null });
    expect(d).toMatchObject({ remind: true, reason: "due" });
    expect(d.slot).toContain("gap");
  });
  it("measures from the last intake", () => {
    const drinks = [intake("10:30")];
    expect(shouldRemind({ now: at("13:29"), settings: base, intakesToday: drinks, lastReminder: null }).reason).toBe("not-due");
    expect(shouldRemind({ now: at("13:30"), settings: base, intakesToday: drinks, lastReminder: null }).remind).toBe(true);
  });
  it("does not repeat until another gap has passed since the reminder", () => {
    const first = shouldRemind({ now: at("12:00"), settings: base, intakesToday: [], lastReminder: null });
    const last = { at: at("12:00").toISOString(), slot: first.slot! };
    expect(shouldRemind({ now: at("12:01"), settings: base, intakesToday: [], lastReminder: last }).reason).toBe("not-due");
    expect(shouldRemind({ now: at("14:59"), settings: base, intakesToday: [], lastReminder: last }).reason).toBe("not-due");
    const cutoffLater = { ...base, cutoffTime: "17:00" };
    expect(shouldRemind({ now: at("15:00"), settings: cutoffLater, intakesToday: [], lastReminder: last }).remind).toBe(true);
  });
  it("ignores yesterday's reminder", () => {
    const last = { at: at("12:00", "2026-10-28").toISOString(), slot: "2026-10-28:gap:x" };
    expect(shouldRemind({ now: at("12:00"), settings: base, intakesToday: [], lastReminder: last }).remind).toBe(true);
  });
  it("works in a different time zone than the machine", () => {
    const tokyo = { ...base, timeZone: "Asia/Tokyo" };
    const now = clockOnDay("2026-10-29", "12:00", "Asia/Tokyo");
    expect(shouldRemind({ now, settings: tokyo, intakesToday: [], lastReminder: null }).remind).toBe(true);
    expect(shouldRemind({ now, settings: base, intakesToday: [], lastReminder: null }).reason).toBe("outside-work-hours"); // 23:00 in Toronto
  });
  it("keeps working across the daylight-saving change", () => {
    // Monday 2026-11-02 is the first work day after clocks go back.
    const now = at("12:00", "2026-11-02");
    expect(shouldRemind({ now, settings: base, intakesToday: [], lastReminder: null }).remind).toBe(true);
    expect(at("09:00", "2026-11-02").toISOString()).toBe("2026-11-02T14:00:00.000Z"); // EST
    expect(at("09:00", "2026-10-29").toISOString()).toBe("2026-10-29T13:00:00.000Z"); // EDT
  });
});

describe("shouldRemind, set times", () => {
  const times: Settings = { ...base, reminder: { mode: "times", times: ["13:30", "10:00"] } };

  it("is not due before the first time", () => {
    expect(shouldRemind({ now: at("09:30"), settings: times, intakesToday: [], lastReminder: null }).reason).toBe("not-due");
  });
  it("fires at a set time when nothing was drunk since the previous one", () => {
    const d = shouldRemind({ now: at("10:00"), settings: times, intakesToday: [], lastReminder: null });
    expect(d).toMatchObject({ remind: true, slot: "2026-10-29:time:10:00" });
  });
  it("skips when there was caffeine since the previous time", () => {
    expect(shouldRemind({ now: at("13:30"), settings: times, intakesToday: [intake("11:00")], lastReminder: null }).reason).toBe("not-due");
    expect(shouldRemind({ now: at("13:30"), settings: times, intakesToday: [intake("09:30")], lastReminder: null }).remind).toBe(true);
  });
  it("fires once per set time", () => {
    const last = { at: at("10:00").toISOString(), slot: "2026-10-29:time:10:00" };
    expect(shouldRemind({ now: at("10:05"), settings: times, intakesToday: [], lastReminder: last }).reason).toBe("already-reminded");
  });
  it("fires late after the computer was asleep, until the next set time", () => {
    expect(shouldRemind({ now: at("11:45"), settings: times, intakesToday: [], lastReminder: null }).slot).toBe("2026-10-29:time:10:00");
    expect(shouldRemind({ now: at("14:00"), settings: times, intakesToday: [], lastReminder: null }).slot).toBe("2026-10-29:time:13:30");
  });
  it("ignores set times outside work hours", () => {
    const odd = { ...times, reminder: { mode: "times" as const, times: ["08:00", "18:00"] } };
    expect(shouldRemind({ now: at("12:00"), settings: odd, intakesToday: [], lastReminder: null }).reason).toBe("not-due");
  });
});

describe("nextReminderAt", () => {
  it("is start + gap before any drink, and last drink + gap after", () => {
    expect(nextReminderAt({ now: at("09:30"), settings: base, intakesToday: [], lastReminder: null })).toEqual(at("12:00"));
    expect(nextReminderAt({ now: at("11:00"), settings: base, intakesToday: [intake("10:30")], lastReminder: null })).toEqual(at("13:30"));
  });
  it("is null when the next one would be past the cut-off", () => {
    expect(nextReminderAt({ now: at("13:00"), settings: base, intakesToday: [intake("12:30")], lastReminder: null })).toBeNull();
  });
  it("is null once the daily limit is reached", () => {
    expect(nextReminderAt({ now: at("10:00"), settings: base, intakesToday: [intake("09:30", 400)], lastReminder: null })).toBeNull();
  });
  it("is the next set time in times mode", () => {
    const times: Settings = { ...base, reminder: { mode: "times", times: ["10:00", "13:30"] } };
    expect(nextReminderAt({ now: at("10:01"), settings: times, intakesToday: [], lastReminder: null })).toEqual(at("13:30"));
  });
});

describe("dailyTotals", () => {
  it("groups by the day in the given time zone", () => {
    const late = intake("23:30", 50); // 03:30 UTC next day
    const totals = dailyTotals([late, intake("08:00", 96)], TZ);
    expect(totals.get("2026-10-29")).toBe(146);
    expect(dailyTotals([late], "UTC").get("2026-10-30")).toBe(50);
  });
});
