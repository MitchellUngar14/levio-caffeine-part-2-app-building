import { useAppData } from "../data/AppData";
import { clock } from "../lib/format";

export function HistoryDrawer({ collapsed, onToggle, onAdd }: { collapsed: boolean; onToggle(): void; onAdd(): void }) {
  const data = useAppData();
  const count = `${data.todayIntakes.length} ${data.todayIntakes.length === 1 ? "drink" : "drinks"}`;

  if (collapsed) {
    return (
      <aside id="history-drawer" className="drawer closed" aria-label="Today’s drinks">
        <div className="drawer-strip">
          <button type="button" className="btn btn-primary" onClick={onAdd} aria-haspopup="dialog" aria-label="Add a drink" style={{ height: 56, fontSize: 24, fontWeight: 800 }}>
            +
          </button>
          <button type="button" className="btn drawer-tab" onClick={onToggle} aria-expanded="false" aria-controls="history-drawer" aria-label="Show today’s drinks">
            <span aria-hidden="true" style={{ fontSize: 22, fontWeight: 800 }}>
              «
            </span>
            <span className="vertical">history · {count}</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside id="history-drawer" className="drawer open" aria-label="Today’s drinks">
      <section className="panel" style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h2 className="panel-title">
            <span className="prompt">$</span> history --today
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="small muted">{count}</span>
            <button type="button" className="btn btn-icon" onClick={onToggle} aria-expanded="true" aria-controls="history-drawer" aria-label="Hide today’s drinks" style={{ border: "1px solid var(--border)", color: "var(--accent)", fontWeight: 800 }}>
              »
            </button>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd} aria-haspopup="dialog" style={{ margin: "12px 0 8px", minHeight: 48, justifyContent: "flex-start", fontSize: 15, fontWeight: 800 }}>
          &gt; brew --add <span style={{ fontWeight: 400 }}>(add a drink)</span>
        </button>
        {data.todayIntakes.map((it) => (
          <div className="row" key={it.id}>
            <span className="muted" style={{ width: 48, flex: "none" }}>
              {clock(it.takenAt, data.settings.timeZone)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>{it.name}</span>
            <b style={{ flex: "none" }}>{it.mg} mg</b>
            <button type="button" className="btn btn-icon" onClick={() => void data.removeIntake(it.id)} aria-label={`Remove ${clock(it.takenAt, data.settings.timeZone)} ${it.name}`}>
              ×
            </button>
          </div>
        ))}
        {data.todayIntakes.length === 0 && <p className="small muted">nothing logged yet today.</p>}
      </section>
    </aside>
  );
}
