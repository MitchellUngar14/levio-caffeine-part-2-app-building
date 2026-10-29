import { type Settings as SettingsT, type Weekday, clockToMinutes, isExportFile, isValidTimeZone } from "@caffeine/core";
import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../data/AppData";
import { type NotifyStatus, notifyStatus, requestNotifications, showNotification } from "../lib/notify";
import { useStore } from "../store/StoreProvider";

const DAYS: { n: Weekday; label: string }[] = [
  { n: 1, label: "mon" },
  { n: 2, label: "tue" },
  { n: 3, label: "wed" },
  { n: 4, label: "thu" },
  { n: 5, label: "fri" },
  { n: 6, label: "sat" },
  { n: 7, label: "sun" },
];

export function Settings() {
  const data = useAppData();
  const store = useStore();
  const [form, setForm] = useState<SettingsT>(data.settings);
  const [saved, setSaved] = useState(false);
  const [newTime, setNewTime] = useState("10:00");
  const [notify, setNotify] = useState<NotifyStatus>(notifyStatus());
  const [message, setMessage] = useState("");

  useEffect(() => setForm(data.settings), [data.settings]);

  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return Array.from(new Set([detected, form.timeZone, ...list])).filter(isValidTimeZone);
  }, [form.timeZone]);
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const set = <K extends keyof SettingsT>(key: K, value: SettingsT[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const problems: string[] = [];
  if (form.workDays.length === 0) problems.push("pick at least one work day");
  if (!(form.dailyLimitMg > 0)) problems.push("daily limit must be above 0");
  if (form.reminder.mode === "gap" && !(form.reminder.gapMinutes >= 15)) problems.push("gap must be at least 15 minutes");
  if (form.reminder.mode === "times") {
    const s = clockToMinutes(form.workStart);
    const e = clockToMinutes(form.workEnd);
    const inHours = (t: string) => {
      const m = clockToMinutes(t);
      return e > s ? m >= s && m < e : m >= s || m < e;
    };
    if (form.reminder.times.length === 0) problems.push("add at least one reminder time");
    if (form.reminder.times.some((t) => !inHours(t))) problems.push("reminder times must fall within work hours");
  }

  const save = async () => {
    if (problems.length) return;
    await data.saveSettings(form);
    setSaved(true);
  };

  const toggleDay = (n: Weekday) => set("workDays", form.workDays.includes(n) ? form.workDays.filter((d) => d !== n) : [...form.workDays, n].sort());

  const addTime = () => {
    if (form.reminder.mode !== "times" || !newTime || form.reminder.times.includes(newTime)) return;
    set("reminder", { mode: "times", times: [...form.reminder.times, newTime].sort() });
  };

  const exportData = async () => {
    const file = await store.exportAll();
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caffeine-tracker-${file.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isExportFile(parsed)) throw new Error("not a caffeine tracker export");
      if (!window.confirm("Replace everything in this browser with the imported data?")) return;
      await store.importAll(parsed);
      await data.refresh();
      setMessage("imported");
    } catch (e) {
      setMessage(`import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const gapHours = form.reminder.mode === "gap" ? form.reminder.gapMinutes / 60 : 3;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 className="panel-title" style={{ fontSize: 26 }}>
        <span className="prompt">$</span> config --edit
      </h1>

      <section className="panel" style={{ gap: 20 }}>
        <h2 className="section-label">// work_day</h2>
        <label className="field" htmlFor="tz">
          time_zone
          <select id="tz" value={form.timeZone} onChange={(e) => set("timeZone", e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
                {z === detected ? " (detected)" : ""}
              </option>
            ))}
          </select>
          <span style={{ fontWeight: 400 }}>Work hours and reminder times use this time zone.</span>
        </label>
        <fieldset style={{ margin: 0, padding: 0, border: "none" }}>
          <legend className="field" style={{ padding: 0, marginBottom: 8 }}>
            work_days
          </legend>
          <div className="chips">
            {DAYS.map((d) => (
              <label key={d.n} className={`chip${form.workDays.includes(d.n) ? " on" : ""}`}>
                <input type="checkbox" checked={form.workDays.includes(d.n)} onChange={() => toggleDay(d.n)} /> {d.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid-2">
          <label className="field">
            start
            <input type="time" value={form.workStart} onChange={(e) => set("workStart", e.target.value)} />
          </label>
          <label className="field">
            end
            <input type="time" value={form.workEnd} onChange={(e) => set("workEnd", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-label">// reminders</h2>
        <fieldset style={{ margin: 0, padding: 0, border: "none", display: "flex", flexDirection: "column", gap: 12 }}>
          <legend style={{ padding: 0, marginBottom: 4, fontWeight: 600 }}>When should we remind you?</legend>
          <label className={`radio-box${form.reminder.mode === "gap" ? " on" : ""}`} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <input type="radio" name="mode" checked={form.reminder.mode === "gap"} onChange={() => set("reminder", { mode: "gap", gapMinutes: Math.round(gapHours * 60) })} />
            if no caffeine for
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={gapHours}
              aria-label="Hours without caffeine"
              onChange={(e) => set("reminder", { mode: "gap", gapMinutes: Math.round(Number(e.target.value) * 60) })}
              style={{ width: 72, height: 40, padding: "0 8px", border: "1px solid var(--input)", borderRadius: 4, background: "var(--bg)" }}
            />
            hours
          </label>
          <div className={`radio-box${form.reminder.mode === "times" ? " on" : ""}`}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
              <input type="radio" name="mode" checked={form.reminder.mode === "times"} onChange={() => set("reminder", { mode: "times", times: form.reminder.mode === "times" ? form.reminder.times : ["10:00", "13:30"] })} />
              at set times
            </label>
            {form.reminder.mode === "times" && (
              <>
                <div className="chips">
                  {form.reminder.times.map((t) => (
                    <span key={t} className="chip" style={{ paddingRight: 0, cursor: "default" }}>
                      {t}
                      <button type="button" className="btn btn-icon" aria-label={`Remove ${t}`} onClick={() => set("reminder", { mode: "times", times: form.reminder.mode === "times" ? form.reminder.times.filter((x) => x !== t) : [] })}>
                        ×
                      </button>
                    </span>
                  ))}
                  <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="New reminder time" style={{ height: 44, padding: "0 8px", border: "1px solid var(--input)", borderRadius: 4, background: "var(--bg)" }} />
                  <button type="button" className="btn btn-accent" onClick={addTime} style={{ borderStyle: "dashed" }}>
                    + add time
                  </button>
                </div>
                <span className="small muted">At each time, you’re reminded only if you haven’t had caffeine since the time before it, or since the start of work. Times must fall within your work hours.</span>
              </>
            )}
          </div>
        </fieldset>
      </section>

      <section className="panel">
        <h2 className="section-label">// limits</h2>
        <div className="grid-2">
          <label className="field">
            daily_limit_mg
            <input type="number" min={1} value={form.dailyLimitMg} onChange={(e) => set("dailyLimitMg", Number(e.target.value))} />
          </label>
          <label className="field">
            cutoff
            <input type="time" value={form.cutoffTime} onChange={(e) => set("cutoffTime", e.target.value)} />
          </label>
        </div>
        <span className="small muted">No reminders once you reach your limit, or after the cut-off, to protect your sleep.</span>
      </section>

      <section className="panel">
        <h2 className="section-label">// appearance</h2>
        <fieldset style={{ margin: 0, padding: 0, border: "none" }}>
          <legend style={{ padding: 0, marginBottom: 8, fontWeight: 600 }}>Theme</legend>
          <div className="chips">
            {(["system", "light", "dark"] as const).map((t) => (
              <label key={t} className={`chip${form.theme === t ? " on" : ""}`}>
                <input type="radio" name="theme" checked={form.theme === t} onChange={() => set("theme", t)} /> {t}
              </label>
            ))}
          </div>
        </fieldset>
        <span className="small muted">System follows your computer’s light or dark setting.</span>
      </section>

      <section className="panel" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14 }}>
          <b>
            notifications: <span className={notify === "granted" ? "prompt" : "warn"}>{notify}</span>
          </b>
          <br />
          <span className="muted">{notify === "granted" ? "Keep this tab open to get reminders." : notify === "denied" ? "Blocked in the browser. Reminders show as a banner on the page instead." : "Allow notifications so reminders can reach you."}</span>
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {notify === "default" && (
            <button type="button" className="btn btn-accent" onClick={() => void requestNotifications().then(setNotify)}>
              [ allow ]
            </button>
          )}
          <button type="button" className="btn" onClick={() => setMessage(showNotification("caffeine_tracker", "Test reminder: this is what one looks like.") ? "test sent" : "notifications not allowed yet")}>
            [ send test ]
          </button>
        </div>
      </section>

      <section className="panel" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14 }}>
          <b>data</b>
          <br />
          <span className="muted">Everything lives in this browser. Export a JSON backup, or import one.</span>
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={() => void exportData()}>
            [ export ]
          </button>
          <label className="btn" style={{ cursor: "pointer" }}>
            [ import ]
            <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => void importData(e.target.files?.[0])} />
          </label>
        </div>
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
        {message && <span className="small muted">{message}</span>}
        {problems.length > 0 && (
          <span className="small warn" role="alert">
            {problems.join(" · ")}
          </span>
        )}
        {saved && <span className="small prompt">saved</span>}
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={problems.length > 0} style={{ minHeight: 48, fontWeight: 800 }}>
          [ save ]
        </button>
      </div>
    </div>
  );
}
