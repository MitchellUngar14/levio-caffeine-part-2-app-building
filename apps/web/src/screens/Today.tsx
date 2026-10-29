import { nextReminderAt } from "@caffeine/core";
import { useState } from "react";
import { AddDrinkDialog } from "../components/AddDrinkDialog";
import { CoffeeCup } from "../components/CoffeeCup";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { useAppData } from "../data/AppData";
import { demoSettings } from "../lib/demo";
import { asciiBar, clock, pct } from "../lib/format";

export function Today() {
  const data = useAppData();
  const [adding, setAdding] = useState(false);
  const { settings, todayIntakes } = data;
  const limit = settings.dailyLimitMg;
  const total = todayIntakes.reduce((s, i) => s + i.mg, 0);
  const over = total > limit;
  const totalColor = over || total === limit ? "var(--warn)" : "var(--accent)";
  const bar = asciiBar(total, limit);
  const last = todayIntakes[todayIntakes.length - 1];
  const next = nextReminderAt({ now: new Date(), settings: demoSettings(settings), intakesToday: todayIntakes, lastReminder: data.lastReminder });
  const collapsed = settings.historyCollapsed;

  return (
    <div className="columns">
      <main className="main-col">
        <section className="panel" style={{ gap: 8, padding: "20px 24px 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <h1 className="section-label">// today</h1>
            <span className="small muted">
              tz={settings.timeZone} · {settings.workStart}–{settings.workEnd}
            </span>
          </div>
          <CoffeeCup mg={total} limit={limit} size="fill" max={collapsed ? 720 : 520} />
        </section>

        <section className="panel" aria-label="Today’s metrics" style={{ gap: 20 }}>
          <div className="metrics">
            <Tile label="total_today" value={total} unit=" mg" color={totalColor} />
            <Tile label="daily_limit" value={limit} unit=" mg" />
            <Tile label="last_drink" value={last ? clock(last.takenAt, settings.timeZone) : "--:--"} />
            <Tile label="next_reminder" value={next ? clock(next, settings.timeZone) : "--:--"} />
          </div>
          <div className="bar" aria-label={`${total} of ${limit} milligrams`}>
            <span className="muted">[</span>
            <span style={{ color: totalColor }}>{bar.on}</span>
            <span style={{ color: "var(--border)" }}>{bar.off}</span>
            <span className="muted">] {pct(total, limit)}% of limit</span>
          </div>
          {over && (
            <span className="warn" style={{ fontWeight: 600 }}>
              !! over your daily limit by {total - limit} mg
            </span>
          )}
        </section>
      </main>

      <HistoryDrawer collapsed={collapsed} onToggle={() => void data.saveSettings({ ...settings, historyCollapsed: !collapsed })} onAdd={() => setAdding(true)} />
      <AddDrinkDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function Tile({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="tile">
      <span className="small muted" style={{ fontSize: 12 }}>
        {label}
      </span>
      <span className="tile-value" style={color ? { color } : undefined}>
        {value}
        {unit && <span style={{ fontSize: 16 }}>{unit}</span>}
      </span>
    </div>
  );
}
