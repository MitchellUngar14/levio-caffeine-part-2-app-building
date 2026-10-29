import {
  type CustomDrink,
  type Intake,
  type LastReminder,
  type NewCustomDrink,
  type Settings,
  StoreError,
  clockOnDay,
  shiftDayKey,
  zonedParts,
} from "@caffeine/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "../store/StoreProvider";

export interface AppData {
  ready: boolean;
  settings: Settings;
  customDrinks: CustomDrink[];
  /** Intakes for today in the user's time zone, oldest first. */
  todayIntakes: Intake[];
  todayKey: string;
  lastReminder: LastReminder | null;
  error: string | null;
  refresh(): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  logDrink(d: { name: string; mg: number; drinkId?: string; serving?: string }): Promise<void>;
  removeIntake(id: string): Promise<void>;
  saveCustomDrink(d: NewCustomDrink | CustomDrink): Promise<CustomDrink>;
  removeCustomDrink(id: string): Promise<void>;
  setLastReminder(r: LastReminder): Promise<void>;
  clearError(): void;
}

const Ctx = createContext<AppData | null>(null);

export function todayBounds(now: Date, timeZone: string): { dayKey: string; from: string; to: string } {
  const dayKey = zonedParts(now, timeZone).dayKey;
  return {
    dayKey,
    from: clockOnDay(dayKey, "00:00", timeZone).toISOString(),
    to: clockOnDay(shiftDayKey(dayKey, 1), "00:00", timeZone).toISOString(),
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customDrinks, setCustomDrinks] = useState<CustomDrink[]>([]);
  const [todayIntakes, setTodayIntakes] = useState<Intake[]>([]);
  const [todayKey, setTodayKey] = useState("");
  const [lastReminder, setLastReminderState] = useState<LastReminder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    const run = async () => {
      try {
        const s = await store.getSettings();
        const { dayKey, from, to } = todayBounds(new Date(), s.timeZone);
        const [drinks, intakes, last] = await Promise.all([store.listCustomDrinks(), store.listIntakes(from, to), store.getLastReminder()]);
        setSettings(s);
        setCustomDrinks(drinks);
        setTodayIntakes(intakes);
        setTodayKey(dayKey);
        setLastReminderState(last);
        setReady(true);
      } catch (e) {
        setError(describe(e));
      }
    };
    loading.current = run();
    await loading.current;
  }, [store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const guard = useCallback(
    async <T,>(work: () => Promise<T>): Promise<T> => {
      try {
        const result = await work();
        await refresh();
        return result;
      } catch (e) {
        setError(describe(e));
        throw e;
      }
    },
    [refresh],
  );

  const value = useMemo<AppData | null>(() => {
    if (!settings) return null;
    return {
      ready,
      settings,
      customDrinks,
      todayIntakes,
      todayKey,
      lastReminder,
      error,
      refresh,
      saveSettings: (s) => guard(() => store.saveSettings(s)),
      logDrink: (d) =>
        guard(async () => {
          await store.addIntake({
            name: d.serving ? `${d.name} · ${d.serving}` : d.name,
            mg: d.mg,
            takenAt: new Date().toISOString(),
            ...(d.drinkId ? { drinkId: d.drinkId } : {}),
          });
        }),
      removeIntake: (id) => guard(() => store.removeIntake(id)),
      saveCustomDrink: (d) => guard(() => store.saveCustomDrink(d)),
      removeCustomDrink: (id) => guard(() => store.removeCustomDrink(id)),
      setLastReminder: (r) => guard(() => store.setLastReminder(r)),
      clearError: () => setError(null),
    };
  }, [ready, settings, customDrinks, todayIntakes, todayKey, lastReminder, error, refresh, guard, store]);

  if (!value) {
    return (
      <div className="page">
        <p className="muted">
          <span className="prompt">~$</span> loading…{error ? ` (${error})` : ""}
        </p>
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppData must be used inside <AppDataProvider>");
  return v;
}

function describe(e: unknown): string {
  if (e instanceof StoreError) {
    if (e.code === "quota") return "browser storage is full: export your data and remove old entries";
    if (e.code === "unavailable") return "browser storage is not available (private window?)";
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}
