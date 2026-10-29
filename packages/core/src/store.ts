import type { CustomDrink, ExportFile, Intake, LastReminder, NewCustomDrink, NewIntake, Settings } from "./types";

export type StoreErrorCode = "quota" | "unavailable" | "conflict" | "invalid";

export class StoreError extends Error {
  constructor(
    public readonly code: StoreErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "StoreError";
  }
}

/**
 * The one way the app reads and writes data. Every method is async so a
 * network-backed store can replace LocalStorageStore without touching callers.
 */
export interface CaffeineStore {
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;

  /** Intakes with `from <= takenAt < to`, both ISO 8601 instants, oldest first. */
  listIntakes(from: string, to: string): Promise<Intake[]>;
  addIntake(i: NewIntake): Promise<Intake>;
  updateIntake(i: Intake): Promise<void>;
  removeIntake(id: string): Promise<void>;

  listCustomDrinks(): Promise<CustomDrink[]>;
  saveCustomDrink(d: NewCustomDrink | CustomDrink): Promise<CustomDrink>;
  removeCustomDrink(id: string): Promise<void>;

  getLastReminder(): Promise<LastReminder | null>;
  setLastReminder(r: LastReminder): Promise<void>;

  exportAll(): Promise<ExportFile>;
  importAll(f: ExportFile): Promise<void>;
}

export function newId(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isExportFile(x: unknown): x is ExportFile {
  if (!x || typeof x !== "object") return false;
  const f = x as Record<string, unknown>;
  return f.version === 1 && typeof f.settings === "object" && Array.isArray(f.intakes) && Array.isArray(f.customDrinks);
}
