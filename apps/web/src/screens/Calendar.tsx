import { clockOnDay, dailyTotals, pad, shiftDayKey, zonedParts } from "@caffeine/core";
import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../data/AppData";
import { dayLabel, monthLabel, pct } from "../lib/format";
import { useStore } from "../store/StoreProvider";

interface Cell {
  dayKey: string;
  day: number;
  mg: number | null; // null = future
  level: "none" | "some" | "over" | "future";
}

export function Calendar() {
  const store = useStore();
  const data = useAppData();
  const tz = data.settings.timeZone;
  const limit = data.settings.dailyLimitMg;
  const today = zonedParts(new Date(), tz);
  const [offset, setOffset] = useState(0);
  const [totals, setTotals] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);

  const { year, month } = useMemo(() => {
    const d = new Date(Date.UTC(today.year, today.month - 1 + offset, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  }, [today.year, today.month, offset]);

  const firstKey = `${year}-${pad(month)}-01`;
  const nextKey = `${month === 12 ? year + 1 : year}-${pad(month === 12 ? 1 : month + 1)}-01`;

  useEffect(() => {
    let live = true;
    const from = clockOnDay(firstKey, "00:00", tz).toISOString();
    const to = clockOnDay(nextKey, "00:00", tz).toISOString();
    void store.listIntakes(from, to).then((intakes) => {
      if (live) setTotals(dailyTotals(intakes, tz));
    });
    return () => {
      live = false;
    };
  }, [store, firstKey, nextKey, tz, data.todayIntakes]);

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    let key = firstKey;
    for (let day = 1; key < nextKey; day++, key = shiftDayKey(key, 1)) {
      const future = key > today.dayKey;
      const mg = future ? null : (totals.get(key) ?? 0);
      const level: Cell["level"] = future ? "future" : mg === 0 ? "none" : mg! > limit ? "over" : "some";
      out.push({ dayKey: key, day, mg, level });
    }
    return out;
  }, [firstKey, nextKey, today.dayKey, totals, limit]);

  const lead = (weekdayMondayFirst(firstKey) + 6) % 7;
  const selectedKey = selected && selected.startsWith(`${year}-${pad(month)}`) ? selected : (today.dayKey.startsWith(`${year}-${pad(month)}`) ? today.dayKey : cells[cells.length - 1]?.dayKey) ?? null;
  const sel = cells.find((c) => c.dayKey === selectedKey);
  const withCaffeine = cells.filter((c) => (c.mg ?? 0) > 0);
  const overDays = withCaffeine.filter((c) => c.level === "over").length;
  const avg = withCaffeine.length ? Math.round(withCaffeine.reduce((s, c) => s + (c.mg ?? 0), 0) / withCaffeine.length) : 0;
  const highest = withCaffeine.reduce<Cell | null>((best, c) => (!best || (c.mg ?? 0) > (best.mg ?? 0) ? c : best), null);

  return (
    <div className="columns">
      <main className="panel" style={{ flex: "2 1 600px", minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h1 className="panel-title">
            <span className="prompt">$</span> cal --month <span className="prompt">{`${year}-${pad(month)}`}</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" className="btn" onClick={() => setOffset(offset - 1)} aria-label="Previous month" style={{ minWidth: 44, padding: 0 }}>
              &lt;
            </button>
            <span style={{ minWidth: 168, textAlign: "center", fontWeight: 600 }}>{monthLabel(year, month)}</span>
            <button type="button" className="btn" onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Next month" style={{ minWidth: 44, padding: 0 }}>
              &gt;
            </button>
          </div>
        </div>

        <div className="cal-grid" role="grid" aria-label={monthLabel(year, month)}>
          {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
            <span key={d} role="columnheader" className="cal-head">
              {d}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`lead-${i}`} aria-hidden="true" />
          ))}
          {cells.map((c) => {
            const status = c.level === "future" ? "no data yet" : c.level === "none" ? "no caffeine" : c.level === "over" ? "over the limit" : `${pct(c.mg ?? 0, limit)}% of daily limit`;
            return (
              <button
                key={c.dayKey}
                type="button"
                className={`cal-cell ${c.level}${c.dayKey === selectedKey ? " selected" : ""}`}
                disabled={c.level === "future"}
                aria-pressed={c.dayKey === selectedKey}
                aria-label={`${dayLabel(c.dayKey)}: ${c.mg === null ? status : `${c.mg} mg, ${status}`}`}
                onClick={() => setSelected(c.dayKey)}
              >
                <span className="cal-day">
                  <span>{c.day}</span>
                  <span style={{ fontSize: 11 }}>{c.dayKey === today.dayKey ? "today" : ""}</span>
                </span>
                <span className="cal-pct">{c.level === "future" ? "" : c.level === "none" ? "–" : `${pct(c.mg ?? 0, limit)}%`}</span>
              </button>
            );
          })}
        </div>

        <div className="legend">
          <span>
            <span className="swatch" style={{ background: "var(--surface)" }} />
            no caffeine
          </span>
          <span>
            <span className="swatch" style={{ background: "var(--accent)", borderColor: "var(--accent)" }} />
            caffeine · % of daily limit
          </span>
          <span>
            <span className="swatch" style={{ background: "var(--warn)", borderColor: "var(--warn)" }} />
            over the limit
          </span>
        </div>
      </main>

      <aside style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }} aria-label="Month summary">
        <section className="panel" style={{ gap: 12 }}>
          <h2 className="section-label">// selected_day</h2>
          {sel ? (
            <>
              <b>{dayLabel(sel.dayKey)}</b>
              <span style={{ fontSize: 36, lineHeight: "42px", fontWeight: 800, color: sel.level === "over" ? "var(--warn)" : sel.level === "some" ? "var(--accent)" : "var(--muted)" }}>
                {sel.mg ?? 0}
                <span style={{ fontSize: 16 }}> mg</span>
              </span>
              <span className={sel.level === "over" ? "warn" : "muted"} style={{ fontSize: 14 }}>
                {sel.level === "over"
                  ? `!! ${pct(sel.mg ?? 0, limit)}%: over by ${(sel.mg ?? 0) - limit} mg`
                  : sel.level === "some"
                    ? `${pct(sel.mg ?? 0, limit)}% of your ${limit} mg limit`
                    : "no caffeine"}
              </span>
            </>
          ) : (
            <span className="muted">pick a day</span>
          )}
        </section>
        <section className="panel" style={{ gap: 10 }}>
          <h2 className="section-label">// month_summary</h2>
          <span className="kv">
            <span className="muted">caffeine_days</span>
            <b>{withCaffeine.length}</b>
          </span>
          <span className="kv">
            <span className="muted">over_limit_days</span>
            <b className={overDays ? "warn" : ""}>{overDays}</b>
          </span>
          <span className="kv">
            <span className="muted">avg_on_caffeine_days</span>
            <b>{avg} mg</b>
          </span>
          <span className="kv">
            <span className="muted">highest_day</span>
            <b>{highest ? `${highest.mg} mg · ${dayLabel(highest.dayKey).replace(/^\w+,? /, "")}` : "–"}</b>
          </span>
        </section>
      </aside>
    </div>
  );
}

/** 1 = Monday … 7 = Sunday for a "YYYY-MM-DD" key. */
function weekdayMondayFirst(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}
