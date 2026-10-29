import { searchDrinks } from "@caffeine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../data/AppData";

/** The "log --drink" popup: search the drink list, or add your own. */
export function AddDrinkDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const data = useAppData();
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [mg, setMg] = useState("");
  const [serving, setServing] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      setQuery("");
      setFormError("");
      dlg.showModal();
      dlg.querySelector<HTMLInputElement>("#drink-search")?.focus();
    } else if (!open && dlg.open) dlg.close();
  }, [open]);

  const results = useMemo(() => searchDrinks(query, undefined, data.customDrinks), [query, data.customDrinks]);

  const log = async (r: { id: string; name: string; mg: number; serving?: string; custom: boolean }) => {
    await data.logDrink({ name: r.name, mg: r.mg, drinkId: r.id, ...(r.serving ? { serving: r.serving } : {}) });
    onClose();
  };

  const saveCustom = async (andLog: boolean) => {
    const n = name.trim();
    const m = Number(mg);
    if (!n || !(m > 0)) {
      setFormError("needs a name and mg above 0");
      return;
    }
    const s = serving.trim();
    const drink = await data.saveCustomDrink({ name: n, mg: m, ...(s ? { serving: s } : {}) });
    setName("");
    setMg("");
    setServing("");
    setFormError("");
    if (andLog) {
      await data.logDrink({ name: drink.name, mg: drink.mg, drinkId: drink.id, ...(drink.serving ? { serving: drink.serving } : {}) });
      onClose();
    } else setQuery(n);
  };

  return (
    <dialog
      ref={ref}
      className="dlg"
      aria-labelledby="add-drink-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      <div className="dlg-body">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <h2 id="add-drink-title" className="panel-title">
            <span className="prompt">$</span> log --drink
          </h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close" style={{ border: "1px solid var(--border)" }}>
            ×
          </button>
        </div>

        <label className="field" htmlFor="drink-search">
          search drinks
          <input id="drink-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="coffee, coke zero, red bull…" />
        </label>

        <div>
          <p className="small muted" style={{ margin: "0 0 4px", fontWeight: 600 }}>
            {query.trim() ? `# ${results.length} ${results.length === 1 ? "match" : "matches"} for "${query.trim()}"` : "# your drinks, then the drink list"}
          </p>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {results.map((r) => (
              <div className="row" key={`${r.custom ? "c" : "b"}-${r.id}`} style={{ gap: 16, padding: "10px 0" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{r.name}</b>
                  <br />
                  <span className="small muted">
                    {r.serving ? `${r.serving} · ` : ""}
                    {r.mg} mg{r.custom ? " · yours" : ""}
                  </span>
                </span>
                <button type="button" className="btn btn-accent" onClick={() => void log(r)} aria-label={`Log ${r.name}`}>
                  [ log ]
                </button>
              </div>
            ))}
            {results.length === 0 && <p className="small muted">no match for “{query}”. Add it below.</p>}
          </div>
        </div>

        <div className="custom-box">
          <b style={{ fontSize: 14 }}>
            not found? <span className="prompt">add --custom</span>
          </b>
          <div className="grid-2">
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              name
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Office cold brew" />
            </label>
            <label className="field">
              caffeine_mg
              <input type="number" inputMode="numeric" min={1} value={mg} onChange={(e) => setMg(e.target.value)} placeholder="200" />
            </label>
            <label className="field">
              serving
              <input type="text" value={serving} onChange={(e) => setServing(e.target.value)} placeholder="473 ml" />
            </label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <button type="button" className="btn btn-primary" onClick={() => void saveCustom(true)}>
              [ save + log ]
            </button>
            <button type="button" className="btn" onClick={() => void saveCustom(false)}>
              [ save ]
            </button>
            {formError && (
              <span className="small warn" role="alert">
                {formError}
              </span>
            )}
          </div>
        </div>
        <span className="small muted">esc to close · logging a drink closes this panel</span>
      </div>
    </dialog>
  );
}
