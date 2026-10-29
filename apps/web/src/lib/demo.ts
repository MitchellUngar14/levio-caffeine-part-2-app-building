import type { Settings } from "@caffeine/core";

/** `?demo=1` shortens the reminder gap to a minute and checks every 10 seconds. */
export function isDemoMode(): boolean {
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

export function demoSettings(settings: Settings): Settings {
  if (!isDemoMode() || settings.reminder.mode !== "gap") return settings;
  return { ...settings, reminder: { mode: "gap", gapMinutes: 1 } };
}

export function checkIntervalMs(): number {
  return isDemoMode() ? 10_000 : 60_000;
}
