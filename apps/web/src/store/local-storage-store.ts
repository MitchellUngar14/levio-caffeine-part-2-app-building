import { DEFAULT_SETTINGS, InMemoryStore, StoreError, type StoreData, emptyData } from "@caffeine/core";

export const STORAGE_KEY = "caffeine-tracker:v1";

/**
 * The only code that touches localStorage. Keeps the whole data set as one
 * JSON value under STORAGE_KEY and rewrites it after every change.
 */
export class LocalStorageStore extends InMemoryStore {
  constructor(private readonly storage: Storage = window.localStorage, defaultTimeZone?: string) {
    super(load(storage, defaultTimeZone));
  }

  protected override async persist(): Promise<void> {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
        throw new StoreError("quota", "browser storage is full");
      }
      throw new StoreError("unavailable", "browser storage is not available");
    }
  }
}

function load(storage: Storage, defaultTimeZone?: string): StoreData {
  const fresh = emptyData({ ...DEFAULT_SETTINGS, timeZone: defaultTimeZone ?? DEFAULT_SETTINGS.timeZone });
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return fresh;
  }
  if (!raw) return fresh;
  try {
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      settings: { ...fresh.settings, ...(parsed.settings ?? {}) },
      customDrinks: Array.isArray(parsed.customDrinks) ? parsed.customDrinks : [],
      intakes: Array.isArray(parsed.intakes) ? parsed.intakes : [],
      lastReminder: parsed.lastReminder ?? null,
    };
  } catch {
    // Corrupt data: start fresh rather than crash. The old value stays until the next save.
    return fresh;
  }
}
