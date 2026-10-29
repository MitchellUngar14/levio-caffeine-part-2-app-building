import { shouldRemind, zonedParts } from "@caffeine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppData } from "../data/AppData";
import { checkIntervalMs, demoSettings } from "../lib/demo";
import { showNotification } from "../lib/notify";

/**
 * Checks the reminder rule every minute (10 s in demo mode) and when the tab
 * becomes visible again. Shows a system notification, or an in-page banner
 * when notifications aren't allowed.
 */
export function useReminderTimer(): { banner: string | null; dismissBanner(): void } {
  const data = useAppData();
  const [banner, setBanner] = useState<string | null>(null);
  const latest = useRef(data);
  latest.current = data;
  const busy = useRef(false);

  const tick = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const d = latest.current;
      const now = new Date();
      const settings = demoSettings(d.settings);
      // A new day in the user's zone: reload today's intakes first.
      if (zonedParts(now, settings.timeZone).dayKey !== d.todayKey) {
        await d.refresh();
        return;
      }
      const decision = shouldRemind({ now, settings, intakesToday: d.todayIntakes, lastReminder: d.lastReminder });
      if (!decision.remind || !decision.slot) return;
      const body = `No caffeine for a while. Time for a ${settings.reminder.mode === "gap" ? "top-up" : "scheduled cup"}.`;
      if (!showNotification("caffeine_tracker", body)) setBanner(body);
      await d.setLastReminder({ at: now.toISOString(), slot: decision.slot });
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    void tick();
    const id = window.setInterval(() => void tick(), checkIntervalMs());
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick]);

  return { banner, dismissBanner: () => setBanner(null) };
}
