import { type CaffeineStore, InMemoryStore, defaultSettings, isValidTimeZone } from "@caffeine/core";
import { LocalStorageStore } from "./local-storage-store";

/** The one place that picks a store. Set VITE_STORE=memory for a throwaway session. */
export function createStore(): CaffeineStore {
  const kind = import.meta.env.VITE_STORE ?? "local";
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tz = isValidTimeZone(browserTz) ? browserTz : "UTC";
  if (kind === "memory") return new InMemoryStore({ settings: defaultSettings(tz) });
  return new LocalStorageStore(window.localStorage, tz);
}
