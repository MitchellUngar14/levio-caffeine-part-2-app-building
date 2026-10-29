import { pad, zonedParts } from "@caffeine/core";

export function clock(instant: Date | string, timeZone: string): string {
  const p = zonedParts(typeof instant === "string" ? new Date(instant) : instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function dayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function pct(mg: number, limit: number): number {
  return limit > 0 ? Math.round((mg / limit) * 100) : 0;
}

export function asciiBar(mg: number, limit: number, width = 20): { on: string; off: string } {
  const n = Math.max(0, Math.min(width, Math.round((mg / Math.max(1, limit)) * width)));
  return { on: "█".repeat(n), off: "░".repeat(width - n) };
}
