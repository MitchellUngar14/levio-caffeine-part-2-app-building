/** 1 = Monday … 7 = Sunday (ISO weekday numbering). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** "HH:MM" in the user's time zone. */
export type ClockTime = string;

export type ReminderMode =
  | { mode: "gap"; gapMinutes: number }
  | { mode: "times"; times: ClockTime[] };

export type ThemeSetting = "system" | "light" | "dark";

export interface Settings {
  timeZone: string; // IANA, e.g. "America/Toronto"
  workDays: Weekday[];
  workStart: ClockTime;
  workEnd: ClockTime;
  reminder: ReminderMode;
  dailyLimitMg: number;
  cutoffTime: ClockTime;
  theme: ThemeSetting;
  historyCollapsed: boolean;
}

export interface Drink {
  id: string;
  name: string;
  aliases: string[];
  serving: string;
  mg: number;
  source: string;
}

export interface CustomDrink {
  id: string;
  name: string;
  mg: number;
  serving?: string;
}
export type NewCustomDrink = Omit<CustomDrink, "id">;

export interface Intake {
  id: string;
  drinkId?: string;
  name: string; // copied when logged
  mg: number; // copied when logged
  takenAt: string; // ISO 8601, UTC
}
export type NewIntake = Omit<Intake, "id">;

export interface LastReminder {
  at: string; // ISO 8601, UTC
  slot: string; // which gap or set time this reminder was for
}

export interface ExportFile {
  version: 1;
  exportedAt: string;
  settings: Settings;
  customDrinks: CustomDrink[];
  intakes: Intake[];
  lastReminder: LastReminder | null;
}

export const DEFAULT_SETTINGS: Settings = {
  timeZone: "UTC",
  workDays: [1, 2, 3, 4, 5],
  workStart: "09:00",
  workEnd: "17:00",
  reminder: { mode: "gap", gapMinutes: 180 },
  dailyLimitMg: 400,
  cutoffTime: "15:00",
  theme: "system",
  historyCollapsed: false,
};

export function defaultSettings(timeZone?: string): Settings {
  return { ...DEFAULT_SETTINGS, timeZone: timeZone ?? DEFAULT_SETTINGS.timeZone };
}
