import type { Route } from "../hooks/useHashRoute";
import { isDemoMode } from "../lib/demo";

export function Nav({ route, mode, onToggleTheme }: { route: Route; mode: "light" | "dark"; onToggleTheme(): void }) {
  const link = (r: Route, label: string) => (
    <a href={`#/${r}`} className="navlink" aria-current={route === r ? "page" : undefined}>
      {label}
    </a>
  );
  return (
    <header className="header">
      <b className="brand">
        <span className="prompt">~$</span> caffeine_tracker
        {isDemoMode() && (
          <span className="small muted" style={{ marginLeft: 12, fontWeight: 400 }}>
            --demo
          </span>
        )}
      </b>
      <nav className="nav" aria-label="Main">
        {link("today", "./today")}
        {link("calendar", "./calendar")}
        {link("settings", "./settings")}
        <button type="button" className="btn btn-ghost" onClick={onToggleTheme} aria-label="Switch colour theme">
          theme: {mode}
        </button>
      </nav>
    </header>
  );
}
